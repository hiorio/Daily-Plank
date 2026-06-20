export interface Exercise {
  id: string;
  name: string;
  shortDescription: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  imageSource?: string;
  animationSource?: string;
  startGuide: string;
  activeGuides: string[];
  cautions: string[];
  alternativeExerciseId?: string;
}
