//
//  WebSocketClient.swift
//  ArabAI
//
//  WebSocket client for real-time backend communication
//

import Foundation

/// WebSocket client for conversation backend
class WebSocketClient: NSObject {

    // MARK: - Properties

    private var webSocketTask: URLSessionWebSocketTask?
    private let session: URLSession
    private let baseURL: String
    private let sessionID: String

    // MARK: - State

    /// Connection state
    enum ConnectionState {
        case disconnected
        case connecting
        case connected
        case reconnecting
    }

    private(set) var connectionState: ConnectionState = .disconnected {
        didSet {
            onConnectionStateChanged?(connectionState)
        }
    }

    private(set) var isConnected = false

    // Reconnection
    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 5
    private var reconnectTimer: Timer?
    private var isIntentionalDisconnect = false  // Track voluntary disconnects

    // MARK: - Callbacks

    var onConnectionStateChanged: ((ConnectionState) -> Void)?
    var onConnected: (() -> Void)?
    var onDisconnected: (() -> Void)?
    var onAvatarStateChanged: ((AvatarState) -> Void)?
    var onAIResponseText: ((String) -> Void)?
    var onAIResponseAudio: ((Data) -> Void)?
    var onDialectChanged: ((String, String) -> Void)?  // (dialectCode, dialectNameArabic)
    var onError: ((Error) -> Void)?

    // MARK: - Initialization

    init(baseURL: String = "ws://localhost:8000", sessionID: String? = nil) {
        self.baseURL = baseURL
        self.sessionID = sessionID ?? UUID().uuidString

        // Configure URLSession
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 60

        self.session = URLSession(configuration: configuration)

        super.init()
    }

    // MARK: - Connection Management

    /// Connect to WebSocket server
    func connect() {
        guard connectionState != .connected && connectionState != .connecting else {
            print("⚠️ Already connected or connecting")
            return
        }

        connectionState = .connecting
        isIntentionalDisconnect = false  // Reset flag when reconnecting

        // Construct WebSocket URL
        let urlString = "\(baseURL)/ws/\(sessionID)"
        guard let url = URL(string: urlString) else {
            print("❌ Invalid WebSocket URL: \(urlString)")
            connectionState = .disconnected
            return
        }

        print("🔌 Connecting to \(urlString)")

        // Create WebSocket task
        webSocketTask = session.webSocketTask(with: url)
        webSocketTask?.resume()

        connectionState = .connected
        isConnected = true
        reconnectAttempts = 0

        // Start receiving messages
        receiveMessage()

        // Notify connection
        onConnected?()
        print("✅ WebSocket connected")
    }

    /// Disconnect from WebSocket server
    func disconnect() {
        guard isConnected else { return }

        isIntentionalDisconnect = true  // Mark as voluntary disconnect
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        isConnected = false
        connectionState = .disconnected

        onDisconnected?()
        print("🔌 WebSocket disconnected")
    }

    /// Attempt to reconnect with exponential backoff
    private func attemptReconnect() {
        // Don't reconnect if it was an intentional disconnect
        guard !isIntentionalDisconnect else {
            print("ℹ️ Skipping reconnection (intentional disconnect)")
            return
        }

        guard reconnectAttempts < maxReconnectAttempts else {
            print("❌ Max reconnection attempts reached")
            connectionState = .disconnected
            return
        }

        reconnectAttempts += 1
        connectionState = .reconnecting

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        let delay = min(pow(2.0, Double(reconnectAttempts - 1)), 16.0)
        print("🔄 Reconnecting in \(delay)s (attempt \(reconnectAttempts)/\(maxReconnectAttempts))")

        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.connect()
        }
    }

    // MARK: - Message Sending

    /// Send WebSocket message to server
    private func send(message: WebSocketMessage) {
        guard isConnected else {
            print("⚠️ Cannot send message - not connected")
            return
        }

        do {
            let encoder = JSONEncoder()
            encoder.keyEncodingStrategy = .convertToSnakeCase
            let data = try encoder.encode(message)

            if let jsonString = String(data: data, encoding: .utf8) {
                let wsMessage = URLSessionWebSocketTask.Message.string(jsonString)

                webSocketTask?.send(wsMessage) { error in
                    if let error = error {
                        print("❌ Failed to send message: \(error)")
                        self.onError?(error)
                    }
                }
            }
        } catch {
            print("❌ Failed to encode message: \(error)")
            onError?(error)
        }
    }

    /// Send user speech transcription
    func sendUserSpeech(text: String, isFinal: Bool, confidence: Double? = nil) {
        let timestampMs = Date().timeIntervalSince1970 * 1000

        let data: [String: Any] = [
            "text": text,
            "is_final": isFinal,
            "confidence": confidence as Any,
            "client_timestamp_ms": timestampMs
        ]

        let message = WebSocketMessage(type: .userSpeech, data: data)
        send(message: message)

        print("📤 [\(timestampMs)] Sent user speech: \(text) (final: \(isFinal))")
    }

    /// Send start conversation signal with optional learning mode and dialect
    func sendStartConversation(learningMode: Bool = false, dialect: Dialect? = nil) {
        var data: [String: Any] = [
            "learning_mode": learningMode
        ]

        if let dialect = dialect {
            data["dialect"] = dialect.rawValue
        }

        let message = WebSocketMessage(type: .startConversation, data: data)
        send(message: message)

        if let dialect = dialect {
            print("📤 Sent start conversation (learning_mode=\(learningMode), dialect=\(dialect.rawValue))")
        } else {
            print("📤 Sent start conversation (learning_mode=\(learningMode))")
        }
    }

    /// Send stop conversation signal
    func sendStopConversation() {
        let message = WebSocketMessage(type: .stopConversation)
        send(message: message)
        print("📤 Sent stop conversation")
    }

    /// Send dialect change request
    func sendChangeDialect(dialect: Dialect) {
        let data: [String: Any] = [
            "dialect": dialect.rawValue
        ]

        let message = WebSocketMessage(type: .changeDialect, data: data)
        send(message: message)
        print("📤 Sent change dialect: \(dialect.rawValue)")
    }

    // MARK: - Message Receiving

    /// Continuously receive messages from server
    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .success(let message):
                self.handleMessage(message)

                // Continue receiving
                self.receiveMessage()

            case .failure(let error):
                // Don't log errors for intentional disconnects
                if !self.isIntentionalDisconnect {
                    print("❌ WebSocket receive error: \(error)")
                    self.onError?(error)
                }

                self.connectionState = .disconnected
                self.isConnected = false

                // Attempt reconnection
                self.attemptReconnect()
            }
        }
    }

    /// Handle received WebSocket message
    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            handleTextMessage(text)

        case .data(let data):
            // Handle binary data if needed
            print("📥 Received binary data: \(data.count) bytes")

        @unknown default:
            print("⚠️ Unknown message type")
        }
    }

    /// Parse and route text message
    private func handleTextMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }

        do {
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase

            let message = try decoder.decode(WebSocketMessage.self, from: data)

            // Route based on message type
            switch message.type {
            case .avatarState:
                if let data = message.data {
                    handleAvatarState(data)
                }

            case .aiResponseText:
                if let data = message.data {
                    handleAIResponseText(data)
                }

            case .aiResponseAudio:
                if let data = message.data {
                    handleAIResponseAudio(data)
                }

            case .dialectChanged:
                if let data = message.data {
                    handleDialectChanged(data)
                }

            case .error:
                if let data = message.data {
                    handleError(data)
                }

            case .status:
                if let data = message.data {
                    handleStatus(data)
                }

            case .ping:
                // Heartbeat from server - acknowledge silently
                print("💓 Received heartbeat ping")

            default:
                print("⚠️ Unhandled message type: \(message.type)")
            }

        } catch {
            print("❌ Failed to decode message: \(error)")
            print("Raw message: \(text)")
        }
    }

    // MARK: - Message Handlers

    private func handleAvatarState(_ data: [String: AnyCodable]) {
        guard let stateString = data["state"]?.value as? String,
              let state = AvatarState(rawValue: stateString) else {
            print("⚠️ Invalid avatar state data")
            return
        }

        print("📥 Avatar state: \(state)")
        onAvatarStateChanged?(state)
    }

    private func handleAIResponseText(_ data: [String: AnyCodable]) {
        guard let text = data["text"]?.value as? String else {
            print("⚠️ Invalid AI response text data")
            return
        }

        print("📥 AI response: \(text)")
        onAIResponseText?(text)
    }

    private func handleAIResponseAudio(_ data: [String: AnyCodable]) {
        guard let base64Audio = data["audio_data"]?.value as? String,
              let audioData = Data(base64Encoded: base64Audio) else {
            print("⚠️ Invalid audio data")
            return
        }

        let chunkIndex = data["chunk_index"]?.value as? Int ?? 0
        print("📥 Audio chunk \(chunkIndex): \(audioData.count) bytes")

        onAIResponseAudio?(audioData)
    }

    private func handleError(_ data: [String: AnyCodable]) {
        let code = data["code"]?.value as? String ?? "UNKNOWN"
        let message = data["message"]?.value as? String ?? "Unknown error"

        print("❌ Server error [\(code)]: \(message)")

        let error = NSError(
            domain: "WebSocketClient",
            code: -1,
            userInfo: [NSLocalizedDescriptionKey: message]
        )
        onError?(error)
    }

    private func handleStatus(_ data: [String: AnyCodable]) {
        let status = data["status"]?.value as? String ?? "unknown"
        let message = data["message"]?.value as? String

        if let message = message {
            print("ℹ️ Status [\(status)]: \(message)")
        } else {
            print("ℹ️ Status: \(status)")
        }
    }

    private func handleDialectChanged(_ data: [String: AnyCodable]) {
        guard let dialectCode = data["dialect"]?.value as? String,
              let dialectNameArabic = data["dialect_name_arabic"]?.value as? String else {
            print("⚠️ Invalid dialect changed data")
            return
        }

        let success = data["success"]?.value as? Bool ?? false

        if success {
            print("✅ Dialect changed: \(dialectCode) (\(dialectNameArabic))")
            onDialectChanged?(dialectCode, dialectNameArabic)
        } else {
            print("❌ Failed to change dialect: \(dialectCode)")
        }
    }

    // MARK: - Cleanup

    deinit {
        disconnect()
    }
}
