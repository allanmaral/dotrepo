export interface Project {
  id: string;
  path: string;
  version: string;
  dependencies: Dependency[];
}

export enum DependencyType {
  Package = "package",
  Project = "project",
}

export interface Dependency {
  id: string;
  type: DependencyType;
  version?: string;
  path?: string;
}