//
//  LottieView.swift
//  ArabAI
//
//  SwiftUI wrapper for Lottie animations
//

import SwiftUI
import Lottie

/// SwiftUI view wrapper for Lottie animations
struct LottieView: UIViewRepresentable {

    let animationName: String
    let loopMode: LottieLoopMode
    let contentMode: UIView.ContentMode

    init(
        animationName: String,
        loopMode: LottieLoopMode = .loop,
        contentMode: UIView.ContentMode = .scaleAspectFit
    ) {
        self.animationName = animationName
        self.loopMode = loopMode 
        self.contentMode = contentMode
    }

    func makeUIView(context: Context) -> LottieAnimationView {
        let animationView = LottieAnimationView(name: animationName)
        animationView.loopMode = loopMode
        animationView.contentMode = contentMode
        animationView.play()
        return animationView
    }

    func updateUIView(_ uiView: LottieAnimationView, context: Context) {
        // Reload animation when state changes
        // Store the current animation name to check for changes
        if context.coordinator.currentAnimationName != animationName {
            context.coordinator.currentAnimationName = animationName
            uiView.animation = LottieAnimation.named(animationName)
            uiView.play()
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    class Coordinator {
        var currentAnimationName: String = ""
    }
}
