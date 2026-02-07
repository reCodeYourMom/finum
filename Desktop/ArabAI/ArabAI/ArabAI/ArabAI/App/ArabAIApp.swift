//
//  ArabAIApp.swift
//  ArabAI
//
//  App entry point
//

import SwiftUI

@main
struct ArabAIApp: App {

    // MARK: - Configuration

    // Backend URL - change this to your production URL
    private let backendURL = "ws://192.168.1.166:8000"

    // MARK: - App Scene

    var body: some Scene {
        WindowGroup {
            // 🎨 DESIGN PREMIUM - Version inline
            PremiumConversationView(backendURL: backendURL)
                .preferredColorScheme(.dark)
        }
    }
}

// MARK: - Premium Animated Background

struct AnimatedBackground: View {
    @State private var animateGradient = false

    var body: some View {
        LinearGradient(
            colors: [
                Color(red: 0.06, green: 0.09, blue: 0.16),
                Color(red: 0.12, green: 0.11, blue: 0.29),
                Color(red: 0.19, green: 0.18, blue: 0.51),
                Color(red: 0.12, green: 0.23, blue: 0.54)
            ],
            startPoint: animateGradient ? .topLeading : .bottomLeading,
            endPoint: animateGradient ? .bottomTrailing : .topTrailing
        )
        .ignoresSafeArea()
        .onAppear {
            withAnimation(.easeInOut(duration: 15).repeatForever(autoreverses: true)) {
                animateGradient.toggle()
            }
        }
    }
}

// MARK: - Particles

struct ParticlesView: View {
    @State private var particles: [Particle] = []

    struct Particle: Identifiable {
        let id = UUID()
        var x: CGFloat
        var y: CGFloat
        var opacity: Double
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                ForEach(particles) { particle in
                    Circle()
                        .fill(Color.white.opacity(particle.opacity))
                        .frame(width: 3, height: 3)
                        .position(x: particle.x, y: particle.y)
                        .blur(radius: 1)
                }
            }
            .onAppear {
                startParticles(size: geometry.size)
            }
        }
    }

    private func startParticles(size: CGSize) {
        for _ in 0..<30 {
            particles.append(Particle(
                x: CGFloat.random(in: 0...size.width),
                y: CGFloat.random(in: 0...size.height),
                opacity: Double.random(in: 0.1...0.3)
            ))
        }

        Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
            withAnimation(.linear(duration: 0.05)) {
                for i in 0..<particles.count {
                    particles[i].y -= 0.5
                    if particles[i].y < 0 {
                        particles[i].y = size.height
                        particles[i].x = CGFloat.random(in: 0...size.width)
                    }
                }
            }
        }
    }
}

// MARK: - Premium Conversation View

struct PremiumConversationView: View {
    let backendURL: String

    var body: some View {
        ZStack {
            // Animated gradient background
            AnimatedBackground()

            // Particles
            ParticlesView()
                .opacity(0.6)

            // Original conversation view on top
            ConversationView(backendURL: backendURL)
                .background(Color.clear)
        }
    }
}
