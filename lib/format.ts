// Mapea de formato BD a formato QuestionScreen
export function formatQuestion(q: any) {
  return {
    id: q.id,
    question: q.question_text,
    time_limit: q.time_limit,
    is_double_points: q.is_double_points,
    answers: q.answers.map((a: any) => ({
      id: a.id,
      text: a.answer_text,
      is_correct: a.is_correct,
    })),
  };
}