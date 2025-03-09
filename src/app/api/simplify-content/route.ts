// src/app/api/simplify-content/route.ts
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
                    content: `You are an educational content adapter for ESL students at ${level} CEFR level. 
          Simplify the text while preserving all key information. 
          Use vocabulary and sentence structures appropriate for the target level. 
          Format your response with HTML: Important terms should be wrapped in <strong> tags.
          Difficult concepts should include simple explanations in parentheses.
          Use <p> tags for paragraphs.`
                },
                { role: "user", content }
            ]
        });

        return NextResponse.json({
            success: true,
            simplifiedContent: response.choices[0].message.content
        });
    } catch (error: any) {
        console.error("Error simplifying content:", error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}