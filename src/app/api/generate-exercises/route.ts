// src/app/api/generate-exercises/route.ts
import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

const groqClient = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export async function POST(request: Request) {
    try {
        const { content, level } = await request.json();

        const response = await groqClient.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `Create 3 practice exercises for ESL students at ${level} CEFR level based on this content. Include: 
          1. Vocabulary practice
          2. Comprehension questions
          3. A writing prompt
          Format your response in HTML with exercise types as <h3> headings.`
                },
                { role: "user", content }
            ]
        });

        return NextResponse.json({
            success: true,
            exercises: response.choices[0].message.content
        });
    } catch (error: any) {
        console.error("Error generating exercises:", error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}