// src/components/ExerciseGenerator.tsx
"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DownloadIcon, RotateCcwIcon, ArrowLeftIcon } from "lucide-react";

interface ExerciseGeneratorProps {
	exercises: string;
	onBack: () => void;
	onRestart: () => void;
}

export function ExerciseGenerator({
	exercises,
	onBack,
	onRestart,
}: ExerciseGeneratorProps) {
	const contentRef = useRef<HTMLDivElement>(null);
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
						ref={contentRef}
						className="prose max-w-none"
						dangerouslySetInnerHTML={{ __html: exercises }}
					/>
				</div>
			</CardContent>

			<CardFooter className="flex justify-between">
				<Button variant="outline" onClick={onBack} size="sm">
					<ArrowLeftIcon className="h-4 w-4 mr-2" /> Back to Content
				</Button>
				<Button variant="outline" onClick={onRestart} size="sm">
					<RotateCcwIcon className="h-4 w-4 mr-2" /> Start Over
				</Button>
			</CardFooter>
		</Card>
	);
}
