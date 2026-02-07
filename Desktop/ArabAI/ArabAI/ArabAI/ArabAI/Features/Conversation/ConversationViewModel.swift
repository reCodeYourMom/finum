//
//  ConversationViewModel.swift
//  ArabAI
//
//  Main conversation orchestration - connects all components
//

import Foundation
import Combine
import SwiftUI

/// Orchestrates conversation flow between audio, network, and avatar
class ConversationViewModel: ObservableObject {

    // MARK: - Published State

    @Published var isConversationActive = false
    @Published var statusMessage = "جاهز للمحادثة"  // "Ready for conversation"
    @Published var lastUserMessage = ""
    @Published var lastAIMessage = ""
    @Published var errorMessage: String?

    // UI feedback state
    @Published var connectionStatusArabic: String = "غير متصل"
    @Published var activityStatusArabic: String = ""

    // Learning mode (enabled by default)
    @Published var learningModeEnabled: Bool = true

    // Dialect selection
    @Published var selectedDialect: Dialect = .msa
    @Published var currentDialectName: String = "الفصحى"  // Arabic name display

    // MARK: - Components

    private let audioCaptureManager = AudioCaptureManager()
    private let audioPlayer = AudioPlayer()
    let webSocketClient: WebSocketClient  // Internal pour accès depuis la View
    let avatarAnimator = AvatarAnimator()

    // MARK: - Internal State

    private var isAISpeaking = false

    // MARK: - Configuration

    private let backendURL: String

    // MARK: - Initialization

    init(backendURL: String = "ws://localhost:8000") {
        self.backendURL = backendURL
        self.webSocketClient = WebSocketClient(baseURL: backendURL)

        setupCallbacks()
    }

    // MARK: - Setup

    private func setupCallbacks() {
        // Audio capture callbacks
        audioCaptureManager.onTranscriptionUpdate = { [weak self] text, isFinal in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.lastUserMessage = text

                // Only send final transcriptions to reduce noise
                if isFinal {
                    self.statusMessage = "معالجة..."  // "Processing..."
                }
            }
        }

        audioCaptureManager.onSpeechSegmentComplete = { [weak self] text in
            guard let self = self else { return }

            DispatchQueue.main.async {
                print("📤 Sending final transcription: \(text)")
                self.webSocketClient.sendUserSpeech(text: text, isFinal: true)
            }
        }

        audioCaptureManager.onError = { [weak self] error in
            self?.handleError("خطأ في الصوت: \(error.localizedDescription)")
        }

        // WebSocket connection state callback
        webSocketClient.onConnectionStateChanged = { [weak self] state in
            self?.updateConnectionStatus(state)
        }

        // WebSocket callbacks
        webSocketClient.onConnected = { [weak self] in
            DispatchQueue.main.async {
                self?.statusMessage = "متصل"  // "Connected"
            }
        }

        webSocketClient.onDisconnected = { [weak self] in
            DispatchQueue.main.async {
                self?.statusMessage = "غير متصل"  // "Disconnected"
            }
        }

        webSocketClient.onAvatarStateChanged = { [weak self] state in
            DispatchQueue.main.async {
                guard let self = self else { return }

                self.avatarAnimator.setState(state)
                self.isAISpeaking = (state == .speaking)
                self.updateActivityStatus(state)

                // Pause/resume microphone transcription based on AI state
                switch state {
                case .idle:
                    self.statusMessage = "جاهز"  // "Ready"
                    // Don't resume here - will resume when audio finishes playing
                case .listening:
                    self.statusMessage = "استماع..."  // "Listening..."
                    // Reset AI message for new streaming response
                    self.lastAIMessage = ""
                    // Only resume if not playing audio
                    if !self.isAISpeaking {
                        self.audioCaptureManager.resumeTranscription()
                    }
                case .speaking:
                    self.statusMessage = "تحدث..."  // "Speaking..."
                    // Pause transcription to prevent AI voice from being transcribed
                    self.audioCaptureManager.pauseTranscription()
                }
            }
        }

        // User speech interruption callback
        audioCaptureManager.onUserStartedSpeaking = { [weak self] in
            guard let self = self else { return }

            // If AI is speaking, interrupt it
            if self.isAISpeaking {
                print("🛑 User interrupted AI - stopping playback")
                self.audioPlayer.stopAll()
                self.isAISpeaking = false
            }
        }

        webSocketClient.onAIResponseText = { [weak self] text in
            DispatchQueue.main.async {
                guard let self = self else { return }

                // STREAMING MODE: Accumulate text chunks
                if self.lastAIMessage.isEmpty {
                    self.lastAIMessage = text
                } else {
                    self.lastAIMessage += " " + text
                }

                print("💬 AI chunk: \(text)")
                print("💬 Full message so far: \(self.lastAIMessage)")
            }
        }

        webSocketClient.onAIResponseAudio = { [weak self] audioData in
            // Enqueue audio chunk for playback
            self?.audioPlayer.enqueueAudioChunk(audioData)
        }

        webSocketClient.onDialectChanged = { [weak self] dialectCode, dialectNameArabic in
            DispatchQueue.main.async {
                self?.currentDialectName = dialectNameArabic
                print("✅ Dialect changed to: \(dialectNameArabic)")
            }
        }

        webSocketClient.onError = { [weak self] error in
            self?.handleError("خطأ في الاتصال: \(error.localizedDescription)")
        }

        // Audio player callbacks
        audioPlayer.onPlaybackStarted = { [weak self] in
            print("▶️ Playback started")
        }

        audioPlayer.onPlaybackFinished = { [weak self] in
            print("⏹ Playback finished - resuming transcription")
            DispatchQueue.main.async {
                guard let self = self else { return }

                self.statusMessage = "جاهز"  // "Ready"
                self.isAISpeaking = false

                // NOW it's safe to resume transcription (audio has finished playing)
                self.audioCaptureManager.resumeTranscription()
            }
        }

        audioPlayer.onError = { [weak self] error in
            self?.handleError("خطأ في التشغيل: \(error.localizedDescription)")
        }
    }

    // MARK: - Conversation Control

    /// Start conversation
    func startConversation() {
        print("🚀 Starting conversation")

        // Request permissions first
        audioCaptureManager.requestPermissions { [weak self] granted in
            guard let self = self else { return }

            DispatchQueue.main.async {
                if granted {
                    self.actuallyStartConversation()
                } else {
                    self.handleError("يرجى منح الإذن للميكروفون والتعرف على الصوت")
                    // "Please grant microphone and speech recognition permissions"
                }
            }
        }
    }

    private func actuallyStartConversation() {
        // Connect to backend
        webSocketClient.connect()

        // Wait a moment for connection
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            guard let self = self else { return }

            // Send start signal with learning mode and selected dialect
            self.webSocketClient.sendStartConversation(learningMode: self.learningModeEnabled, dialect: self.selectedDialect)

            // Start audio capture
            do {
                try self.audioCaptureManager.startRecording()
                self.isConversationActive = true
                self.statusMessage = "استماع..."  // "Listening..."
                self.errorMessage = nil

                print("✅ Conversation started (learning mode: \(self.learningModeEnabled))")
            } catch {
                self.handleError("فشل بدء التسجيل: \(error.localizedDescription)")
            }
        }
    }

    /// Stop conversation
    func stopConversation() {
        print("⏹ Stopping conversation")

        // Stop audio capture
        audioCaptureManager.stopRecording()

        // Stop audio playback
        audioPlayer.stop()

        // Send stop signal and disconnect
        webSocketClient.sendStopConversation()

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.webSocketClient.disconnect()
        }

        // Reset state
        isConversationActive = false
        statusMessage = "جاهز للمحادثة"  // "Ready for conversation"
        avatarAnimator.reset()

        print("✅ Conversation stopped")
    }

    /// Toggle conversation on/off
    func toggleConversation() {
        if isConversationActive {
            stopConversation()
        } else {
            startConversation()
        }
    }

    /// Change dialect (works before and during conversation)
    func changeDialect(_ dialect: Dialect) {
        selectedDialect = dialect

        // If conversation is active, send change to backend
        if isConversationActive {
            webSocketClient.sendChangeDialect(dialect: dialect)
            print("🔄 Changing active dialect to: \(dialect.displayName)")
        } else {
            // Just update the selection for next conversation
            print("✅ Selected dialect for next conversation: \(dialect.displayName)")
        }
    }

    // MARK: - Status Mapping

    /// Update connection status display in Arabic
    private func updateConnectionStatus(_ state: WebSocketClient.ConnectionState) {
        DispatchQueue.main.async {
            switch state {
            case .disconnected:
                self.connectionStatusArabic = "غير متصل"
            case .connecting:
                self.connectionStatusArabic = "جارٍ الاتصال..."
            case .connected:
                self.connectionStatusArabic = "متصل"
            case .reconnecting:
                self.connectionStatusArabic = "إعادة الاتصال..."
            }
        }
    }

    /// Update activity status display in Arabic
    private func updateActivityStatus(_ avatarState: AvatarState) {
        DispatchQueue.main.async {
            switch avatarState {
            case .idle:
                self.activityStatusArabic = ""
            case .listening:
                self.activityStatusArabic = "أستمع..."
            case .speaking:
                self.activityStatusArabic = "أتكلم..."
            }
        }
    }

    // MARK: - Error Handling

    private func handleError(_ message: String) {
        DispatchQueue.main.async {
            print("❌ Error: \(message)")
            self.errorMessage = message
            self.statusMessage = "خطأ"  // "Error"

            // Auto-clear error after 5 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                self.errorMessage = nil
            }
        }
    }

    // MARK: - Cleanup

    deinit {
        stopConversation()
    }
}
