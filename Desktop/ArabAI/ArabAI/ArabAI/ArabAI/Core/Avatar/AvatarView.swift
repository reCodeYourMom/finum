//
//  AvatarView.swift
//  ArabAI
//
//  Avatar visual representation with Lottie animations
//

import SwiftUI

/// Avatar view with Lottie animated states
struct AvatarView: View {

    @ObservedObject var animator: AvatarAnimator

    // MARK: - Body

    var body: some View {
        ZStack {
            // Background gradient circle
            Circle()
                .fill(
                    LinearGradient(
                        gradient: Gradient(colors: gradientColors),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 220, height: 220)
                .shadow(color: shadowColor, radius: 20, x: 0, y: 10)

            // Lottie animation
            avatarContent
                .frame(width: 200, height: 200)

            // State indicator ring
            Circle()
                .stroke(ringColor, lineWidth: 4)
                .frame(width: 240, height: 240)
                .opacity(ringOpacity)
                .scaleEffect(ringScale)
        }
        .animation(.easeInOut(duration: 0.3), value: animator.currentState)
    }

    // MARK: - Avatar Content

    @ViewBuilder
    private var avatarContent: some View {
        switch animator.currentState {
        case .idle:
            // Idle animation - calm robot/AI
            LottieView(animationName: "avatar_idle")
                .frame(width: 180, height: 180)

        case .listening:
            // Listening animation - sound waves/ears
            LottieView(animationName: "avatar_listening")
                .frame(width: 180, height: 180)

        case .speaking:
            // Speaking animation - talking mouth/sound bars
            LottieView(animationName: "avatar_speaking")
                .frame(width: 180, height: 180)
        }
    }

    // MARK: - State-based Styling (UAE Premium Theme)

    private let uaeGold = Color(red: 0.85, green: 0.65, blue: 0.13)
    private let uaeNavy = Color(red: 0.06, green: 0.15, blue: 0.28)

    private var gradientColors: [Color] {
        switch animator.currentState {
        case .idle:
            // Idle: Navy to Dark Blue
            return [
                uaeNavy,
                Color(red: 0.1, green: 0.2, blue: 0.4)
            ]
        case .listening:
            // Listening: Teal to Green (active listening)
            return [
                Color(red: 0.0, green: 0.6, blue: 0.5),
                Color(red: 0.0, green: 0.8, blue: 0.6)
            ]
        case .speaking:
            // Speaking: Gold gradient (UAE colors)
            return [
                uaeGold,
                Color(red: 0.9, green: 0.7, blue: 0.2)
            ]
        }
    }

    private var shadowColor: Color {
        switch animator.currentState {
        case .idle:
            return uaeNavy.opacity(0.4)
        case .listening:
            return Color.teal.opacity(0.5)
        case .speaking:
            return uaeGold.opacity(0.6)
        }
    }

    private var ringColor: Color {
        switch animator.currentState {
        case .idle:
            return uaeGold.opacity(0.3)
        case .listening:
            return Color.teal
        case .speaking:
            return uaeGold
        }
    }

    private var ringOpacity: Double {
        switch animator.currentState {
        case .idle:
            return 0.4
        case .listening:
            return 0.9
        case .speaking:
            return 1.0
        }
    }

    private var ringScale: CGFloat {
        animator.currentState == .speaking ? 1.05 : 1.0
    }
}

// MARK: - Preview

struct AvatarView_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 40) {
            Group {
                AvatarView(animator: {
                    let animator = AvatarAnimator()
                    animator.setState(.idle)
                    return animator
                }())
                Text("Idle")

                AvatarView(animator: {
                    let animator = AvatarAnimator()
                    animator.setState(.listening)
                    return animator
                }())
                Text("Listening")

                AvatarView(animator: {
                    let animator = AvatarAnimator()
                    animator.setState(.speaking)
                    return animator
                }())
                Text("Speaking")
            }
        }
        .padding()
        .background(Color.black)
    }
}
