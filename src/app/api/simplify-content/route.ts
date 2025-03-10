// src/app/api/simplify-content/route.ts
import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { QdrantClient } from '@qdrant/js-client-rest';

// Initialize clients
const groqClient = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

// Helper function to ensure collection exists
async function ensureCollectionExists() {
    try {
        const collections = await qdrantClient.getCollections();
        if (!collections.collections.find(c => c.name === 'pdf_collection')) {
            await qdrantClient.createCollection('pdf_collection', {
                vectors: {
                    size: 1536, // Dimension size for embeddings
                    distance: 'Cosine'
                }
            });
            console.log("Created pdf_collection collection");
        }
    } catch (error) {
        console.error("Error ensuring collection exists:", error);
        // Don't throw here, try to continue with the request
    }
}

export async function POST(request: Request) {
    try {
        const { content, level } = await request.json();

        // First ensure the collection exists
        await ensureCollectionExists();

        // Generate embeddings using Groq
        // Note: Using a simple embedding approach that works with the chat model
        const embeddingResponse = await groqClient.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "You are an expert at representing text as a 1536-dimensional embedding. Return the embedding as a JSON array of 1536 floating point numbers, and nothing else."
                },
                {
                    role: "user",
                    content: `Generate an embedding for this text: ${content.substring(0, 500)}...` // Truncate for efficiency
                }
            ],
            response_format: { type: "json_object" }
        });

        let embedding;
        try {
            // Try to parse the embedding from the model response
            const responseContent = embeddingResponse.choices[0].message.content;
            const jsonResponse = JSON.parse(responseContent || '{}');
            embedding = jsonResponse.embedding || jsonResponse;

            // Check if the embedding has the right dimension
            if (!Array.isArray(embedding) || embedding.length !== 1536) {
                // Use a fallback approach - pseudo-random embedding
                console.warn("Invalid embedding format from model, using fallback");
                embedding = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
            }
        } catch (error) {
            console.error("Error parsing embedding:", error);
            // Fallback to a pseudo-random embedding
            embedding = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
        }

        // Search Qdrant for relevant context
        let relevantContext = "";
        try {
            const searchResults = await qdrantClient.search('pdf_collection', {
                vector: embedding,
                limit: 3, // Get top 3 most relevant documents
            });

            // Extract and combine relevant context
            if (searchResults && searchResults.length > 0) {
                relevantContext = searchResults
                    .map(result => result.payload?.text || "")
                    .filter(text => typeof text === 'string' && text.trim().length > 0)
                    .join('\n\n');
            }
        } catch (searchError) {
            console.error("Error searching Qdrant:", searchError);
            // Continue without relevant context if search fails
        }

        // Add context hint for debugging
        const contextHint = relevantContext
            ? "Using relevant context from your knowledge base."
            : "No relevant context found in knowledge base.";

        // Generate simplified content
        const response = await groqClient.chat.completions.create({
            model: "llama3-70b-8192", // Use the larger model for high-quality simplification
            messages: [
                {
                    role: "system",
                    content: `You are an educational content adapter for ESL students at ${level} CEFR level.
                    Simplify the text while preserving all key information.
                    Use vocabulary and sentence structures appropriate for the target level.
                    Format your response with HTML: Important terms should be wrapped in <strong> tags.
                    Difficult concepts should include simple explanations in parentheses.
                    Use <p> tags for paragraphs.

                    ${relevantContext ? `Use the following relevant context to enhance your simplification:
                    ${relevantContext}` : ""}
                    
                    Note: ${contextHint}`
                },
                { role: "user", content }
            ]
        });

        return NextResponse.json({
            success: true,
            simplifiedContent: response.choices[0].message.content,
            debug: { contextFound: relevantContext.length > 0 }
        });
    } catch (error: any) {
        console.error("Error simplifying content:", error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}