
"use client";

import type { GenerateQuizOutput } from "@/ai/flows/generate-quiz";
import { generateQuizHint } from "@/ai/flows/generate-quiz-hint";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea"; 
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { HelpCircle, Edit3, CheckCircle, XCircle, Info, ListChecks, Lightbulb, Loader2, Send } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useStudyContext } from "@/context/StudyContext"; 
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface QuizDisplayProps {
  quiz: GenerateQuizOutput;
  onQuizChange: (newQuiz: GenerateQuizOutput) => void;
  isLoading: boolean;
  documentSummary?: string; 
  documentName?: string; 
  isEditable?: boolean; 
}

export default function QuizDisplay({ 
  quiz, 
  onQuizChange, 
  isLoading, 
  documentSummary, 
  documentName,
  isEditable = true 
}: QuizDisplayProps) {
  const [userSelections, setUserSelections] = useState<{[key: number]: string | undefined}>({});
  const [feedback, setFeedback] = useState<{[key: number]: {isCorrect: boolean, reason?: string} | undefined}>({});
  const [hints, setHints] = useState<{[key: number]: string | null | undefined}>({});
  const [isLoadingHint, setIsLoadingHint] = useState<{[key: number]: boolean}>({});
  const [isQuizSubmittedByStudent, setIsQuizSubmittedByStudent] = useState<boolean>(false);
  const { toast } = useToast();
  const { currentUser, recordStudentAttempt } = useStudyContext(); 

  useEffect(() => {
    setUserSelections({});
    setFeedback({});
    setHints({});
    setIsLoadingHint({});
    setIsQuizSubmittedByStudent(false); 
  }, [quiz]);

  const handleQuestionTextChange = (index: number, value: string) => {
    if (!isEditable) return;
    const updatedQuestions = quiz.questions.map((q, i) => 
      i === index ? { ...q, question: value } : q
    );
    onQuizChange({ questions: updatedQuestions });
  };
  
  const handleUserSelection = (qIndex: number, selectedOption: string) => {
    if (isQuizSubmittedByStudent && !isEditable) return; 

    setUserSelections(prev => ({...prev, [qIndex]: selectedOption}));
    const isCorrect = quiz.questions[qIndex].answer === selectedOption;
    setFeedback(prev => ({...prev, [qIndex]: { isCorrect, reason: quiz.questions[qIndex].reason }}));
  };

  const handleGetHint = async (qIndex: number) => {
    if (!isEditable || !documentSummary || !quiz.questions[qIndex]) return;
    setIsLoadingHint(prev => ({...prev, [qIndex]: true}));
    setHints(prev => ({...prev, [qIndex]: undefined}));
    try {
      const result = await generateQuizHint({
        questionText: quiz.questions[qIndex].question,
        documentSummary: documentSummary,
      });
      setHints(prev => ({...prev, [qIndex]: result.hint}));
    } catch (error) {
      console.error("Failed to get hint:", error);
      toast({ variant: "destructive", title: "Hint Failed", description: "Could not get hint." });
      setHints(prev => ({...prev, [qIndex]: null}));
    } finally {
      setIsLoadingHint(prev => ({...prev, [qIndex]: false}));
    }
  };

  const score = useMemo(() => {
    const correctAnswers = Object.values(feedback).filter(f => f?.isCorrect).length;
    const totalQuestions = quiz.questions.length;
    return {
      correct: correctAnswers,
      total: totalQuestions,
      answered: Object.keys(userSelections).length,
    };
  }, [feedback, quiz.questions, userSelections]);

  const allQuestionsAttempted = useMemo(() => {
    return quiz.questions.length > 0 && score.answered === quiz.questions.length;
  }, [quiz.questions.length, score.answered]);


  const handleSubmitQuiz = () => {
    if (!allQuestionsAttempted || currentUser?.role !== 'student' || !documentName) return;
    
    recordStudentAttempt({
      studentId: currentUser.id,
      score: score.correct,
      totalQuestions: score.total,
      quizName: documentName,
    });
    setIsQuizSubmittedByStudent(true);
    toast({ title: "Quiz Submitted!", description: `Your score: ${score.correct}/${score.total}. Results below.`});
  };

  const resultsSummary = useMemo(() => {
    if ( (isEditable && !allQuestionsAttempted) || (!isEditable && !isQuizSubmittedByStudent) ) {
        return [];
    }

    return quiz.questions.map((q, index) => ({
      questionNumber: index + 1,
      isCorrect: feedback[index]?.isCorrect ?? false,
      reason: q.reason, 
    }));
  }, [allQuestionsAttempted, quiz.questions, feedback, isEditable, isQuizSubmittedByStudent]);

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><HelpCircle className="mr-2 h-6 w-6 text-primary" /> Quiz Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border border-muted rounded animate-pulse shadow-sm">
                <div className="h-6 w-full bg-muted rounded mb-2"></div>
                {[...Array(4)].map((_, j) => <div key={j} className="h-4 w-3/4 bg-muted rounded mb-1"></div>)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const quizTitle = documentName 
    ? documentName.toLowerCase().startsWith("custom quiz:") 
      ? `Quiz for Topic: "${documentName.replace(/^Custom Quiz:\s*/i, "")}"` 
      : `Quiz on: "${documentName}"`
    : "Generated Quiz";


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl md:text-2xl">
            <HelpCircle className="mr-2 h-6 w-6 md:h-7 md:w-7 text-primary" /> 
            {quizTitle}
        </CardTitle>
        <CardDescription>
          {isEditable ? "Review and interact with the generated quiz below." : "Select an answer for each question."}
          {!isEditable && " Once all questions are answered, a 'Submit Quiz' button will appear."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {quiz.questions.map((q, qIndex) => (
          <Card key={qIndex} className="bg-card/50 p-3 sm:p-4 shadow-md">
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor={`question-${qIndex}`} className="text-base font-semibold flex items-center">
                {isEditable && <Edit3 size={16} className="mr-2 text-accent" />} 
                Question {qIndex + 1}
              </Label>
              {isEditable && documentSummary && ( 
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleGetHint(qIndex)}
                  disabled={isLoadingHint[qIndex]}
                  className="text-xs shadow-sm hover:shadow transition-shadow py-1 px-2"
                  aria-label={`Get hint for question ${qIndex + 1}`}
                >
                  {isLoadingHint[qIndex] ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Lightbulb className="mr-1 h-3 w-3" />}
                  Hint
                </Button>
              )}
            </div>
            <Textarea
              id={`question-${qIndex}`}
              value={q.question}
              onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
              className="mt-1" 
              aria-label={`Question ${qIndex + 1} text`}
              readOnly={!isEditable}
              rows={4} 
            />

            {isEditable && hints[qIndex] !== undefined && ( 
              <Alert variant="default" className="mt-3 bg-yellow-50 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700 shadow-sm">
                <Lightbulb className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
                <AlertTitle className="text-yellow-700 dark:text-yellow-400">Hint</AlertTitle>
                <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                  {hints[qIndex] || "No hint available or error fetching hint."}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5 mb-3 mt-3">
              <Label className="text-sm font-medium">Options (Click to select)</Label>
              <RadioGroup 
                value={userSelections[qIndex] || ""} 
                onValueChange={(value) => handleUserSelection(qIndex, value)}
                aria-label={`Options for question ${qIndex + 1}`}
                className="space-y-1"
                disabled={!isEditable && isQuizSubmittedByStudent} 
              >
                {q.options.map((option, oIndex) => (
                  <Label 
                    htmlFor={`q${qIndex}-option${oIndex}`} 
                    key={oIndex}
                    className={cn(
                      "flex items-center space-x-2 p-2 sm:p-2.5 border rounded-md cursor-pointer hover:bg-muted/80 transition-colors shadow-sm hover:shadow",
                       userSelections[qIndex] === option && 
                        (isEditable ? 
                          (feedback[qIndex]?.isCorrect ? "border-green-500 bg-green-50 dark:bg-green-900/30" : "border-red-500 bg-red-50 dark:bg-red-900/30")
                          : (!isQuizSubmittedByStudent ? "bg-muted" : 
                              (feedback[qIndex]?.isCorrect ? "border-green-500 bg-green-50 dark:bg-green-900/30" : "border-red-500 bg-red-50 dark:bg-red-900/30")
                            )
                        )
                    )}
                  >
                    <RadioGroupItem value={option} id={`q${qIndex}-option${oIndex}`} className="shrink-0" />
                    <span className="flex-grow text-sm">{option}</span>
                    {isEditable && userSelections[qIndex] === option && feedback[qIndex]?.isCorrect && (
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    )}
                    {isEditable && userSelections[qIndex] === option && feedback[qIndex]?.isCorrect === false && (
                      <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                    )}
                    {!isEditable && isQuizSubmittedByStudent && userSelections[qIndex] === option && feedback[qIndex]?.isCorrect && (
                         <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    )}
                    {!isEditable && isQuizSubmittedByStudent && userSelections[qIndex] === option && feedback[qIndex]?.isCorrect === false && (
                         <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                    )}
                  </Label>
                ))}
              </RadioGroup>
            </div>
            
            {isEditable && feedback[qIndex] && ( 
              <>
                <Alert 
                  variant={feedback[qIndex]?.isCorrect ? "default" : "destructive"} 
                  className={cn(
                    "mt-2 shadow-sm",
                    feedback[qIndex]?.isCorrect ? "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700" : "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700"
                  )}
                >
                  {feedback[qIndex]?.isCorrect ? <CheckCircle className="h-4 w-4 text-green-700 dark:text-green-400" /> : <XCircle className="h-4 w-4 text-red-700 dark:text-red-400" />}
                  <AlertTitle className={feedback[qIndex]?.isCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                    {feedback[qIndex]?.isCorrect ? "Correct!" : "Incorrect."}
                  </AlertTitle>
                </Alert>
                <Alert variant="default" className="mt-2 bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700 shadow-sm">
                  <Info className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                  <AlertTitle className="text-blue-700 dark:text-blue-400">Explanation</AlertTitle>
                  <AlertDescription className="text-blue-700 dark:text-blue-400">
                    {feedback[qIndex]?.reason || "No reason provided."}
                  </AlertDescription>
                </Alert>
              </>
            )}
            {qIndex < quiz.questions.length - 1 && <Separator className="my-4" />}
          </Card>
        ))}
      </CardContent>

      {!isEditable && allQuestionsAttempted && !isQuizSubmittedByStudent && (
        <CardFooter className="flex-col items-center p-6 border-t">
          <Button 
            onClick={handleSubmitQuiz} 
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
            size="lg"
            aria-label="Submit quiz answers"
          >
            <Send className="mr-2 h-5 w-5" />
            Submit Quiz
          </Button>
        </CardFooter>
      )}

      {((isEditable && allQuestionsAttempted) || (!isEditable && isQuizSubmittedByStudent)) && (
        <CardFooter className="flex-col items-start space-y-4 p-4 sm:p-6 border-t">
          <div className="w-full">
            <h3 className="text-lg sm:text-xl font-semibold flex items-center mb-2">
                <ListChecks className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                Quiz Results
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-foreground mb-4">
              Your Score: {score.correct} / {score.total}
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] sm:w-[90px] py-1 px-2 h-auto text-xs sm:text-sm sm:py-2 sm:px-3">Q #</TableHead>
                  <TableHead className="py-1 px-2 h-auto text-xs sm:text-sm sm:py-2 sm:px-3">Status</TableHead>
                  { (isEditable || (!isEditable && isQuizSubmittedByStudent)) && <TableHead className="py-1 px-2 h-auto text-xs sm:text-sm sm:py-2 sm:px-3">Explanation</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultsSummary.map((result) => (
                  <TableRow key={result.questionNumber}>
                    <TableCell className="font-medium py-1 px-2 text-xs sm:text-sm sm:py-2 sm:px-3">{result.questionNumber}</TableCell>
                    <TableCell className="py-1 px-2 text-xs sm:text-sm sm:py-2 sm:px-3">
                      {result.isCorrect ? (
                        <span className="flex items-center text-green-600 dark:text-green-400">
                          <CheckCircle className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4" /> Correct
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600 dark:text-red-400">
                          <XCircle className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4" /> Incorrect
                        </span>
                      )}
                    </TableCell>
                     { (isEditable || (!isEditable && isQuizSubmittedByStudent)) && (
                        <TableCell className="py-1 px-2 text-xs leading-tight sm:text-sm sm:leading-normal sm:py-2 sm:px-3 text-muted-foreground">
                            {result.reason}
                        </TableCell>
                     )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

    
