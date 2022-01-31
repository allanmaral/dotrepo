import { Project } from "../projects/project";

export interface Solution {
  id: string;
  path: string;
  projects: Array<Project>;
}
