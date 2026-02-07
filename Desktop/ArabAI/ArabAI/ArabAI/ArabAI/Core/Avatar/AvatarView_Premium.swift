//
//  AvatarView_Premium.swift
//  ArabAI
//
//  Premium avatar with glassmorphism, particles, and advanced animations
//

import SwiftUI

/// Premium avatar view with micro-interactions
struct AvatarView_Premium: View {

    @ObservedObject var animator: AvatarAnimator

    // MARK: - Animation State

    @State private var listeningPulse: CGFloat = 1.0
    @State private var speakingWaveHeights: [CGFloat] = [10, 15, 12]
    @State private var rotationAngle: Double = 0
    @State private var glowIntensity: Double = 0.5

    // MARK: - Body

    var body: some View {
        ZStack {
            // Outer glow rings (multiple layers)
            ForEach(0..<3) { index in
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [ringColor.opacity(0.6), ringColor.opacity(0.1)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 2
                    )
                    .frame(width: 240 + CGFloat(index * 20), height: 240 + CGFloat(index * 20))
                    .scaleEffect(ringScale + CGFloat(index) * 0.05)
                    .opacity(ringOpacity * (1 - Double(index) * 0.3))
                    .blur(radius: 1)
            }

            // Main avatar container with glassmorphism
            ZStack {
                // Glass background
                Circle()
                    .fill(Color.white.opacity(0.1))
                    .background(
                        Circle()
                            .fill(.ultraThinMaterial)
                    )
                    .overlay(
                        Circle()
                            .stroke(
                                LinearGradient(
                                    colors: [Color.white.opacity(0.3), Color.white.opacity(0.1)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 2
                            )
                    )

                // Premium gradient background
                Circle()
                    .fill(
                        AngularGradient(
                            colors: gradientColors + [gradientColors[0]],
                            center: .center,
                            angle: .degrees(rotationAngle)
                        )
                    )
                    .blur(radius: 30)
                    .opacity(0.6)
            }
            .frame(width: 200, height: 200)
            .shadow(color: shadowColor.opacity(glowIntensity), radius: 30, x: 0, y: 10)
            .pulseGlow(color: ringColor)

            // Avatar content
            avatarContent
                .frame(width: 150, height: 150)

            // Rotating ring indicator
            Circle()
                .trim(from: 0, to: ringProgress)
                .stroke(
                    ringColor,
                    style: StrokeStyle(lineWidth: 4, lineCap: .round)
                )
                .frame(width: 220, height: 220)
                .rotationEffect(.degrees(rotationAngle))
                .opacity(ringOpacity)
        }
        .onAppear {
            startAnimations()
        }
        .onChange(of: animator.currentState) { _ in
            updateAnimations()
        }
    }

    // MARK: - Avatar Content

    @ViewBuilder
    private var avatarContent: some View {
        switch animator.currentState {
        case .idle:
            ZStack {
                // Idle icon with subtle animation
                Image(systemName: "person.circle.fill")
                    .resizable()
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.white, .white.opacity(0.8)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .shadow(color: .white.opacity(0.5), radius: 10)

                // Breathing effect particles
                ForEach(0..<8) { index in
                    Circle()
                        .fill(Color.white.opacity(0.3))
                        .frame(width: 4, height: 4)
                        .offset(
                            x: cos(Double(index) * .pi / 4) * 80,
                            y: sin(Double(index) * .pi / 4) * 80
                        )
                        .scaleEffect(listeningPulse)
                        .blur(radius: 1)
                }
            }

        case .listening:
            ZStack {
                // Listening waveform
                Image(systemName: "waveform.circle.fill")
                    .resizable()
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.white, .green.opacity(0.8)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                // Multiple pulse rings
                ForEach(0..<3) { index in
                    Circle()
                        .stroke(Color.green.opacity(0.4), lineWidth: 2)
                        .scaleEffect(listeningPulse + CGFloat(index) * 0.1)
                        .opacity(2.5 - listeningPulse - CGFloat(index) * 0.3)
                }

                // Sound wave particles
                ForEach(0..<12) { index in
                    Capsule()
                        .fill(Color.green.opacity(0.6))
                        .frame(width: 3, height: CGFloat.random(in: 10...30))
                        .offset(
                            x: cos(Double(index) * .pi / 6) * 70,
                            y: sin(Double(index) * .pi / 6) * 70
                        )
                        .rotationEffect(.degrees(Double(index) * 30))
                        .scaleEffect(listeningPulse)
                }
            }

        case .speaking:
            ZStack {
                // Speaking message icon
                Image(systemName: "message.circle.fill")
                    .resizable()
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.white, .orange.opacity(0.8)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                // Animated sound bars
                HStack(spacing: 6) {
                    ForEach(0..<5) { index in
                        RoundedRectangle(cornerRadius: 4)
                            .fill(
                                LinearGradient(
                                    colors: [.white, .orange],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )
                            .frame(width: 5, height: speakingWaveHeights[index])
                            .shadow(color: .orange.opacity(0.5), radius: 5)
                    }
                }
                .offset(y: 50)

                // Speaking wave rings
                ForEach(0..<2) { index in
                    Circle()
                        .stroke(
                            Color.orange.opacity(0.5),
                            style: StrokeStyle(lineWidth: 3, dash: [5, 5])
                        )
                        .scaleEffect(1.2 + CGFloat(index) * 0.3)
                        .opacity(ringOpacity * (1 - Double(index) * 0.5))
                        .rotationEffect(.degrees(rotationAngle))
                }
            }
        }
    }

    // MARK: - Animations

    private func startAnimations() {
        // Continuous rotation
        withAnimation(.linear(duration: 20).repeatForever(autoreverses: false)) {
            rotationAngle = 360
        }

        // Glow pulsing
        withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
            glowIntensity = 0.8
        }

        updateAnimations()
    }

    private func updateAnimations() {
        switch animator.currentState {
        case .idle:
            withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) {
                listeningPulse = 1.1
            }

        case .listening:
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                listeningPulse = 1.5
            }

        case .speaking:
            // Animate speaking bars
            speakingWaveHeights = [10, 15, 12, 18, 14]

            Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { timer in
                if animator.currentState != .speaking {
                    timer.invalidate()
                    return
                }

                withAnimation(.easeInOut(duration: 0.3)) {
                    speakingWaveHeights = speakingWaveHeights.map { _ in
                        CGFloat.random(in: 15...35)
                    }
                }
            }
        }
    }

    // MARK: - State-based Styling

    private var gradientColors: [Color] {
        switch animator.currentState {
        case .idle:
            return [.premiumPurple, .premiumBlue, .premiumIndigo]
        case .listening:
            return [Color.green, Color.teal, Color.cyan]
        case .speaking:
            return [Color.orange, Color.red, Color.pink]
        }
    }

    private var shadowColor: Color {
        switch animator.currentState {
        case .idle:
            return .premiumPurple
        case .listening:
            return .green
        case .speaking:
            return .orange
        }
    }

    private var ringColor: Color {
        switch animator.currentState {
        case .idle:
            return .premiumPurple
        case .listening:
            return .green
        case .speaking:
            return .orange
        }
    }

    private var ringOpacity: Double {
        switch animator.currentState {
        case .idle:
            return 0.4
        case .listening:
            return 0.8
        case .speaking:
            return 1.0
        }
    }

    private var ringScale: CGFloat {
        switch animator.currentState {
        case .idle:
            return 1.0
        case .listening:
            return listeningPulse
        case .speaking:
            return 1.05
        }
    }

    private var ringProgress: CGFloat {
        switch animator.currentState {
        case .idle:
            return 0.3
        case .listening:
            return 0.7
        case .speaking:
            return 1.0
        }
    }
}

// MARK: - Preview

struct AvatarView_Premium_Previews: PreviewProvider {
    static var previews: some View {
        ZStack {
            AnimatedGradientBackground()

            VStack(spacing: 60) {
                Group {
                    AvatarView_Premium(animator: {
                        let animator = AvatarAnimator()
                        animator.setState(.idle)
                        return animator
                    }())

                    Text("Idle State")
                        .foregroundColor(.white)
                        .font(.caption)
                }

                Group {
                    AvatarView_Premium(animator: {
                        let animator = AvatarAnimator()
                        animator.setState(.listening)
                        return animator
                    }())

                    Text("Listening State")
                        .foregroundColor(.white)
                        .font(.caption)
                }

                Group {
                    AvatarView_Premium(animator: {
                        let animator = AvatarAnimator()
                        animator.setState(.speaking)
                        return animator
                    }())

                    Text("Speaking State")
                        .foregroundColor(.white)
                        .font(.caption)
                }
            }
        }
    }
}
