//
//  AudioCaptureManager.swift
//  ArabAI
//
//  Continuous audio capture with Apple Speech Framework for Arabic STT
//

import Foundation
import AVFoundation
import Speech

/// Manages continuous audio recording and speech recognition
class AudioCaptureManager: NSObject {

    // MARK: - Properties

    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let speechRecognizer: SFSpeechRecognizer?

    private let silenceDetector: SilenceDetector

    // MARK: - State

    private(set) var isRecording = false
    private(set) var isPaused = false
    private var currentTranscription = ""

    // MARK: - Callbacks

    /// Called when user starts speaking (for interruption detection)
    var onUserStartedSpeaking: (() -> Void)?

    /// Called when new transcription is available
    var onTranscriptionUpdate: ((String, Bool) -> Void)?

    /// Called when speech segment ends (after silence)
    var onSpeechSegmentComplete: ((String) -> Void)?

    /// Called on errors
    var onError: ((Error) -> Void)?

    // MARK: - Initialization

    override init() {
        // Initialize Arabic speech recognizer
        self.speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "ar-SA"))
        self.silenceDetector = SilenceDetector()

        super.init()

        // Check recognizer availability
        if let recognizer = speechRecognizer {
            if recognizer.isAvailable {
                print("✅ Arabic speech recognizer available")
                print("   Locale: \(recognizer.locale.identifier)")
                print("   On-device support: \(recognizer.supportsOnDeviceRecognition)")
            } else {
                print("⚠️ Arabic speech recognizer NOT available")
                print("   This usually means:")
                print("   - Testing on simulator (use real device)")
                print("   - Language models not downloaded")
                print("   - No internet connection (for server-based recognition)")
            }
        } else {
            print("❌ Could not create Arabic speech recognizer")
        }

        // Configure silence detector callbacks
        silenceDetector.onSpeechStart = { [weak self] in
            print("🎤 Speech started")
        }

        silenceDetector.onSpeechEnd = { [weak self] in
            guard let self = self else { return }
            print("🎤 Speech ended")

            // Send final transcription
            if !self.currentTranscription.isEmpty {
                self.onSpeechSegmentComplete?(self.currentTranscription)
                self.currentTranscription = ""
            }
        }
    }

    // MARK: - Permissions

    /// Request microphone and speech recognition permissions
    func requestPermissions(completion: @escaping (Bool) -> Void) {
        // Request speech recognition permission
        SFSpeechRecognizer.requestAuthorization { authStatus in
            DispatchQueue.main.async {
                switch authStatus {
                case .authorized:
                    // Request microphone permission
                    AVAudioSession.sharedInstance().requestRecordPermission { granted in
                        DispatchQueue.main.async {
                            completion(granted)
                        }
                    }
                case .denied, .restricted, .notDetermined:
                    completion(false)
                @unknown default:
                    completion(false)
                }
            }
        }
    }

    // MARK: - Recording Control

    /// Start continuous audio capture and recognition
    func startRecording() throws {
        // Reset if already recording
        if isRecording {
            stopRecording()
        }

        // Configure audio session for simultaneous record and playback
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

        print("✅ Audio session configured:")
        print("   Category: \(audioSession.category.rawValue)")
        print("   Mode: \(audioSession.mode.rawValue)")
        print("   Sample rate: \(audioSession.sampleRate) Hz")
        print("   I/O buffer duration: \(audioSession.ioBufferDuration)s")
        print("   Output route: \(audioSession.currentRoute.outputs.map { $0.portName }.joined(separator: ", "))")

        // Create recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else {
            throw AudioCaptureError.recognitionRequestFailed
        }

        // Configure request for continuous recognition
        recognitionRequest.shouldReportPartialResults = true
        // Try on-device first to avoid server connectivity issues
        recognitionRequest.requiresOnDeviceRecognition = true
        recognitionRequest.taskHint = .dictation

        // Get audio input node
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        // Install tap on input node
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            guard let self = self else { return }

            // Only process audio if not paused (prevents transcribing AI's voice)
            guard !self.isPaused else { return }

            // Send buffer to speech recognizer
            self.recognitionRequest?.append(buffer)

            // Process for silence detection
            self.silenceDetector.processAudioBuffer(buffer)
        }

        // Start recognition task
        guard let speechRecognizer = speechRecognizer else {
            throw AudioCaptureError.recognizerNotAvailable
        }

        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }

            if let error = error {
                // Ignore "canceled" errors - they're normal when stopping recording
                let errorMessage = error.localizedDescription
                if !errorMessage.contains("canceled") && !errorMessage.contains("cancelled") {
                    print("❌ Recognition error: \(errorMessage)")
                    self.onError?(error)
                }
                return
            }

            if let result = result {
                let transcription = result.bestTranscription.formattedString
                let isFinal = result.isFinal

                // Update current transcription
                self.currentTranscription = transcription

                // Notify listeners
                self.onTranscriptionUpdate?(transcription, isFinal)

                print("📝 Transcription (\(isFinal ? "final" : "partial")): \(transcription)")

                // When Apple Speech Recognition detects final result, send it
                // But only if it's substantive (more than 2 characters to avoid noise)
                if isFinal && transcription.count > 2 {
                    print("📤 Sending final transcription: \(transcription)")
                    self.onSpeechSegmentComplete?(transcription)
                    self.currentTranscription = ""

                    // Also notify interruption handler
                    self.onUserStartedSpeaking?()
                } else if isFinal {
                    print("⏭ Ignoring empty/short final transcription: '\(transcription)'")
                    self.currentTranscription = ""
                }
            }
        }

        // Start audio engine
        audioEngine.prepare()
        try audioEngine.start()

        isRecording = true
        print("✅ Recording started")
    }

    /// Stop audio capture and recognition
    func stopRecording() {
        guard isRecording else { return }

        // Stop audio engine
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)

        // Stop recognition
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()

        recognitionRequest = nil
        recognitionTask = nil

        // Reset silence detector
        silenceDetector.reset()

        // Reset audio session
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            print("⚠️ Failed to deactivate audio session: \(error)")
        }

        isRecording = false
        isPaused = false
        currentTranscription = ""

        print("⏹ Recording stopped")
    }

    /// Pause transcription (but keep audio engine running)
    /// Used to prevent transcribing AI's voice during TTS playback
    func pauseTranscription() {
        guard isRecording && !isPaused else { return }

        isPaused = true

        // End current recognition request
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()

        // Reset silence detector to avoid false positives
        silenceDetector.reset()
        currentTranscription = ""

        print("⏸ Transcription paused (AI is speaking)")
    }

    /// Resume transcription after AI finishes speaking
    func resumeTranscription() {
        guard isRecording && isPaused else { return }

        isPaused = false
        currentTranscription = ""  // Clear any partial transcription from AI's voice

        // Create new recognition request
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        // Try on-device first to avoid server connectivity issues
        request.requiresOnDeviceRecognition = true
        request.taskHint = .dictation
        recognitionRequest = request

        // Restart recognition task
        guard let speechRecognizer = speechRecognizer else {
            print("❌ Speech recognizer not available for resume")
            return
        }

        recognitionTask = speechRecognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self = self else { return }

            if let error = error {
                let errorMessage = error.localizedDescription
                // Ignore normal cancellation and "no speech" errors
                if !errorMessage.contains("canceled") &&
                   !errorMessage.contains("cancelled") &&
                   !errorMessage.contains("No speech detected") {
                    print("❌ Recognition error: \(errorMessage)")
                    self.onError?(error)
                }
                return
            }

            if let result = result {
                let transcription = result.bestTranscription.formattedString
                let isFinal = result.isFinal

                // Update current transcription
                self.currentTranscription = transcription

                // Notify listeners
                self.onTranscriptionUpdate?(transcription, isFinal)

                print("📝 Transcription (\(isFinal ? "final" : "partial")): \(transcription)")

                // When Apple Speech Recognition detects final result, send it
                // But only if it's substantive (more than 2 characters to avoid noise)
                if isFinal && transcription.count > 2 {
                    print("📤 Sending final transcription: \(transcription)")
                    self.onSpeechSegmentComplete?(transcription)
                    self.currentTranscription = ""

                    // Also notify interruption handler
                    self.onUserStartedSpeaking?()
                } else if isFinal {
                    print("⏭ Ignoring empty/short final transcription: '\(transcription)'")
                    self.currentTranscription = ""
                }
            }
        }

        print("▶️ Transcription resumed (user can speak)")
    }

    // MARK: - Cleanup

    deinit {
        stopRecording()
    }
}

// MARK: - Errors

enum AudioCaptureError: Error {
    case recognitionRequestFailed
    case recognizerNotAvailable
    case audioEngineStartFailed

    var localizedDescription: String {
        switch self {
        case .recognitionRequestFailed:
            return "Failed to create speech recognition request"
        case .recognizerNotAvailable:
            return "Speech recognizer not available for Arabic"
        case .audioEngineStartFailed:
            return "Failed to start audio engine"
        }
    }
}
