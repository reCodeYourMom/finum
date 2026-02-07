//
//  SilenceDetector.swift
//  ArabAI
//
//  Voice Activity Detection (VAD) using RMS-based silence detection
//

import Foundation
import AVFoundation

/// Detects silence in audio stream for conversation segmentation
class SilenceDetector {

    // MARK: - Configuration

    /// RMS threshold below which audio is considered silence
    private let silenceThreshold: Float

    /// Duration of silence before triggering end of speech
    private let silenceDuration: TimeInterval

    /// Minimum speech duration to avoid false positives
    private let minimumSpeechDuration: TimeInterval

    // MARK: - State

    private var silenceStartTime: Date?
    private var speechStartTime: Date?
    private var isSpeaking = false

    // MARK: - Callbacks

    var onSpeechStart: (() -> Void)?
    var onSpeechEnd: (() -> Void)?

    // MARK: - Initialization

    init(
        silenceThreshold: Float = 0.025,  // Lower threshold based on RMS logs
        silenceDuration: TimeInterval = 0.6,  // 600ms for natural conversation with Arabic (balanced latency/accuracy)
        minimumSpeechDuration: TimeInterval = 0.2  // 0.2s minimum speech (more forgiving)
    ) {
        self.silenceThreshold = silenceThreshold
        self.silenceDuration = silenceDuration
        self.minimumSpeechDuration = minimumSpeechDuration
    }

    // MARK: - Audio Processing

    /// Process audio buffer and detect speech/silence
    /// - Parameter buffer: Audio buffer to analyze
    func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData?[0] else { return }

        let frameLength = Int(buffer.frameLength)
        let rms = calculateRMS(channelData: channelData, frameLength: frameLength)

        let isSilent = rms < silenceThreshold

        // Log RMS values periodically (every ~1 second, assuming 44.1kHz and 1024 frame buffer)
        // This helps debug silence detection issues
        if arc4random_uniform(43) == 0 {  // Roughly once per second
            print("🔊 RMS: \(String(format: "%.4f", rms)) | Threshold: \(silenceThreshold) | Silent: \(isSilent) | Speaking: \(isSpeaking)")
        }

        if isSilent {
            handleSilence()
        } else {
            handleSpeech()
        }
    }

    // MARK: - Private Methods

    /// Calculate Root Mean Square (RMS) of audio data
    private func calculateRMS(channelData: UnsafeMutablePointer<Float>, frameLength: Int) -> Float {
        var sum: Float = 0.0

        for i in 0..<frameLength {
            let sample = channelData[i]
            sum += sample * sample
        }

        let mean = sum / Float(frameLength)
        return sqrt(mean)
    }

    /// Handle silence detection
    private func handleSilence() {
        // Start silence timer if speaking
        if isSpeaking && silenceStartTime == nil {
            silenceStartTime = Date()
            print("🔇 Silence started")
        }

        // Check if silence duration exceeded
        if let silenceStart = silenceStartTime {
            let silenceDelta = Date().timeIntervalSince(silenceStart)

            if silenceDelta >= silenceDuration {
                // Verify minimum speech duration before ending
                if let speechStart = speechStartTime {
                    let speechDelta = silenceStart.timeIntervalSince(speechStart)

                    if speechDelta >= minimumSpeechDuration {
                        print("✅ Silence duration reached (\(String(format: "%.1f", silenceDelta))s), ending speech")
                        endSpeech()
                    } else {
                        // Speech was too short, likely noise
                        print("⚠️ Speech too short (\(String(format: "%.1f", speechDelta))s), ignoring")
                        resetState()
                    }
                }
            }
        }
    }

    /// Handle speech detection
    private func handleSpeech() {
        // Reset silence timer
        silenceStartTime = nil

        // Start speech if not already speaking
        if !isSpeaking {
            startSpeech()
        }
    }

    /// Mark speech start
    private func startSpeech() {
        isSpeaking = true
        speechStartTime = Date()
        onSpeechStart?()
    }

    /// Mark speech end
    private func endSpeech() {
        isSpeaking = false
        onSpeechEnd?()
        resetState()
    }

    /// Reset internal state
    private func resetState() {
        silenceStartTime = nil
        speechStartTime = nil
        isSpeaking = false
    }

    /// Manually reset detector (e.g., when stopping conversation)
    func reset() {
        resetState()
    }
}
