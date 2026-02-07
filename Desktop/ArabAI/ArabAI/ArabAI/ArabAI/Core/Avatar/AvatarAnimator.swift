//
//  AvatarAnimator.swift
//  ArabAI
//
//  Avatar animation state machine
//

import Foundation
import Combine

/// Manages avatar animation state transitions
class AvatarAnimator: ObservableObject {

    // MARK: - Published State

    @Published private(set) var currentState: AvatarState = .idle

    // MARK: - Animation Configuration

    /// Animation names for each state (customize based on your assets)
    struct AnimationNames {
        let idle: String
        let listening: String
        let speaking: String

        static let `default` = AnimationNames(
            idle: "avatar_idle",
            listening: "avatar_listening",
            speaking: "avatar_speaking"
        )
    }

    let animationNames: AnimationNames

    // MARK: - Initialization

    init(animationNames: AnimationNames = .default) {
        self.animationNames = animationNames
    }

    // MARK: - State Management

    /// Transition to new avatar state
    func setState(_ newState: AvatarState) {
        guard newState != currentState else { return }

        print("🎭 Avatar state: \(currentState) -> \(newState)")
        currentState = newState
    }

    /// Get animation name for current state
    func currentAnimationName() -> String {
        switch currentState {
        case .idle:
            return animationNames.idle
        case .listening:
            return animationNames.listening
        case .speaking:
            return animationNames.speaking
        }
    }

    /// Reset to idle state
    func reset() {
        setState(.idle)
    }
}
