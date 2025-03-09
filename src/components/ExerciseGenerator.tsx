// src/components/ExerciseGenerator.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface ExerciseGeneratorProps {
	exercises: string;
	onBack: () => void;
}

export function ExerciseGenerator({
	exercises,
	onBack,
}: ExerciseGeneratorProps) {
	return (
		<Card className="w-full max-w-4xl mx-auto">
			<CardHeader>
				<CardTitle>Practice Exercises</CardTitle>
				<CardDescription>
					Customized exercises to help reinforce learning.
				</CardDescription>
			</CardHeader>

			<CardContent>
				<div className="bg-white rounded-md border p-6 shadow-sm">
					<div
						className="prose max-w-none"
						dangerouslySetInnerHTML={{ __html: exercises }}
					/>
				</div>
			</CardContent>

			<CardFooter className="flex justify-between">
				<Button variant="outline" onClick={onBack}>
					Back to Content
				</Button>
				<Button>Download Exercises</Button>
			</CardFooter>
		</Card>
	);
}
