//
//  AudioPlayer.swift
//  ArabAI
//
//  Plays streamed audio chunks from TTS service with buffering
//

import Foundation
import AVFoundation

/// Manages playback of streamed audio chunks with intelligent buffering
class AudioPlayer: NSObject {

    // MARK: - Properties

    private var audioPlayer: AVAudioPlayer?
    private var audioQueue: [Data] = []
    private var isPlaying = false
    private var isFirstChunk = true
    private let fileManager = FileManager.default
    private let tempDirectory: URL

    // Buffering settings - LOW LATENCY MODE: faster response
    private let minBufferSize = 10  // Wait for 10 chunks (~500ms) before starting
    private var hasStartedPlayback = false
    private var allChunksReceived = false  // Track if all chunks have arrived

    // MARK: - Callbacks

    var onPlaybackStarted: (() -> Void)?
    var onPlaybackFinished: (() -> Void)?
    var onError: ((Error) -> Void)?

    // MARK: - Initialization

    override init() {
        // Create temp directory for audio chunks
        let tempPath = NSTemporaryDirectory()
        self.tempDirectory = URL(fileURLWithPath: tempPath).appendingPathComponent("arabai_audio")

        super.init()

        // Create temp directory if needed
        try? fileManager.createDirectory(at: tempDirectory, withIntermediateDirectories: true)
    }

    // MARK: - Playback Control

    /// Add audio chunk to queue and play if buffer is ready
    /// - Parameter audioData: Audio data (MP3 format)
    func enqueueAudioChunk(_ audioData: Data) {
        audioQueue.append(audioData)

        // Start playback once we have enough chunks buffered
        if !isPlaying && !hasStartedPlayback && audioQueue.count >= minBufferSize {
            print("📦 Buffer ready with \(audioQueue.count) chunks - starting playback")
            hasStartedPlayback = true
            playNextChunk()
        } else if !isPlaying && hasStartedPlayback {
            // Already started, just resume playback
            playNextChunk()
        }
    }

    /// Play next audio chunk in queue
    private func playNextChunk() {
        guard !audioQueue.isEmpty else {
            // Queue is empty, playback finished
            isPlaying = false
            isFirstChunk = true
            hasStartedPlayback = false
            onPlaybackFinished?()
            print("⏹ Playback finished")
            return
        }

        isPlaying = true

        // Get next chunk
        let audioData = audioQueue.removeFirst()

        // MAXIMUM MODE: Combine ALL remaining chunks into ONE single playback
        // This eliminates ALL micro-cuts for perfectly smooth audio
        var combinedData = audioData
        var combinedCount = 1

        // Combine ALL remaining chunks
        while !audioQueue.isEmpty {
            combinedData.append(audioQueue.removeFirst())
            combinedCount += 1
        }

        print("🎵 Playing combined chunk (\(combinedData.count) bytes from \(combinedCount) chunks, \(audioQueue.count) remaining)")

        // Save to temp file
        let tempFile = tempDirectory.appendingPathComponent("\(UUID().uuidString).mp3")

        do {
            // Write audio data to temp file
            try combinedData.write(to: tempFile)

            // Create audio player
            audioPlayer = try AVAudioPlayer(contentsOf: tempFile)
            guard let player = audioPlayer else {
                print("❌ Failed to create AVAudioPlayer")
                playNextChunk()
                return
            }

            player.delegate = self
            player.volume = 1.0

            // Prepare and play
            guard player.prepareToPlay() else {
                print("❌ Failed to prepare audio player")
                playNextChunk()
                return
            }

            guard player.play() else {
                print("❌ Failed to start playback")
                playNextChunk()
                return
            }

            // Notify on first chunk
            if isFirstChunk {
                isFirstChunk = false
                onPlaybackStarted?()
                print("▶️ Playback started (\(audioQueue.count) chunks remaining)")
            }

        } catch {
            print("❌ Failed to play audio chunk: \(error)")

            // Skip corrupted chunks silently and try next
            playNextChunk()
        }
    }

    /// Stop playback and clear queue
    func stop() {
        audioPlayer?.stop()
        audioPlayer = nil
        audioQueue.removeAll()
        isPlaying = false
        isFirstChunk = true
        hasStartedPlayback = false

        // Clean up temp files
        cleanupTempFiles()
    }

    /// Stop all audio playback immediately (for interruptions)
    func stopAll() {
        audioQueue.removeAll()
        audioPlayer?.stop()
        audioPlayer = nil
        isPlaying = false
        isFirstChunk = true
        hasStartedPlayback = false
        print("🛑 All audio playback stopped")
    }

    /// Clean up temporary audio files
    private func cleanupTempFiles() {
        do {
            let files = try fileManager.contentsOfDirectory(at: tempDirectory, includingPropertiesForKeys: nil)
            for file in files {
                try? fileManager.removeItem(at: file)
            }
        } catch {
            print("⚠️ Failed to cleanup temp files: \(error)")
        }
    }

    // MARK: - Cleanup

    deinit {
        stop()
        cleanupTempFiles()
    }
}

// MARK: - AVAudioPlayerDelegate

extension AudioPlayer: AVAudioPlayerDelegate {

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        // Play next chunk in queue
        playNextChunk()
    }

    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        if let error = error {
            print("⚠️ Audio decode error: \(error)")
        }

        // Skip and try next chunk
        playNextChunk()
    }
}
