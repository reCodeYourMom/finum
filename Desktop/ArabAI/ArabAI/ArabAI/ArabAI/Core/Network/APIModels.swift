//
//  APIModels.swift
//  ArabAI
//
//  Data models matching backend API
//

import Foundation

// MARK: - Message Types

enum MessageType: String, Codable {
    // Client -> Server
    case userSpeech = "user_speech"
    case startConversation = "start_conversation"
    case stopConversation = "stop_conversation"
    case changeDialect = "change_dialect"

    // Server -> Client
    case avatarState = "avatar_state"
    case aiResponseText = "ai_response_text"
    case aiResponseAudio = "ai_response_audio"
    case dialectChanged = "dialect_changed"
    case error = "error"
    case status = "status"
    case ping = "ping"  // Heartbeat from server
}

// MARK: - Avatar State

enum AvatarState: String, Codable {
    case idle
    case listening
    case speaking
}

// MARK: - Dialect

enum Dialect: String, Codable, CaseIterable {
    case msa = "msa"
    case egyptian = "egyptian"
    case emirati = "emirati"

    var displayName: String {
        switch self {
        case .msa:
            return "الفصحى"  // Modern Standard Arabic
        case .egyptian:
            return "مصري"    // Egyptian
        case .emirati:
            return "إماراتي"  // Emirati
        }
    }

    var englishName: String {
        switch self {
        case .msa:
            return "MSA"
        case .egyptian:
            return "Egyptian"
        case .emirati:
            return "Emirati"
        }
    }
}

// MARK: - WebSocket Message

struct WebSocketMessage: Codable {
    let type: MessageType
    let data: [String: AnyCodable]?
    let timestamp: String?

    init(type: MessageType, data: [String: Any] = [:]) {
        self.type = type
        self.data = data.isEmpty ? nil : data.mapValues { AnyCodable($0) }
        self.timestamp = ISO8601DateFormatter().string(from: Date())
    }
}

// MARK: - User Speech Message

struct UserSpeechData: Codable {
    let text: String
    let isFinal: Bool
    let confidence: Double?

    enum CodingKeys: String, CodingKey {
        case text
        case isFinal = "is_final"
        case confidence
    }
}

// MARK: - Avatar State Message

struct AvatarStateData: Codable {
    let state: AvatarState
    let metadata: [String: AnyCodable]?
}

// MARK: - AI Response Text

struct AIResponseTextData: Codable {
    let text: String
}

// MARK: - AI Audio Chunk

struct AIAudioChunkData: Codable {
    let chunkIndex: Int
    let audioData: String  // Base64 encoded
    let format: String

    enum CodingKeys: String, CodingKey {
        case chunkIndex = "chunk_index"
        case audioData = "audio_data"
        case format
    }
}

// MARK: - Error Message

struct ErrorData: Codable {
    let code: String
    let message: String
    let details: [String: AnyCodable]?
}

// MARK: - Status Message

struct StatusData: Codable {
    let status: String
    let message: String?
}

// MARK: - Dialect Changed Message

struct DialectChangedData: Codable {
    let dialect: String
    let dialectName: String
    let dialectNameArabic: String
    let success: Bool

    enum CodingKeys: String, CodingKey {
        case dialect
        case dialectName = "dialect_name"
        case dialectNameArabic = "dialect_name_arabic"
        case success
    }
}

// MARK: - AnyCodable Helper

/// Type-erased codable wrapper for heterogeneous dictionaries
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dictionary = try? container.decode([String: AnyCodable].self) {
            value = dictionary.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dictionary as [String: Any]:
            try container.encode(dictionary.mapValues { AnyCodable($0) })
        default:
            try container.encodeNil()
        }
    }
}
