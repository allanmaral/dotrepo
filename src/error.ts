import { Project } from "./projects/project";

export class AppError extends Error {
  public readonly name: string;
  public readonly exitCode: number;
  public readonly project?: Project;

  constructor(error: Error, exitCode: number, project?: Project)
  constructor(name: string, description: string, exitCode: number, project?: Project)

  constructor(arg1: string | Error, arg2: string | number, arg3?: number | Project, arg4?: Project) {
    let name: string;
    let description: string;
    let exitCode: number;
    let project: Project | undefined;
    let stack: string | undefined;

    if (typeof arg1 === "string") {
      name = arg1;
      description = arg2 as string;
      exitCode = arg3 as number;
      project = arg4;
    } else {
      name = arg1.name;
      description = arg1.message;
      stack = arg1.stack;
      exitCode = arg2 as number;
      project = arg3 as Project | undefined;
    }

    super(description);

    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain

    this.name = name;
    this.exitCode = exitCode;
    this.project = project;

    if (!stack) {
      Error.captureStackTrace(this);
    } else {
      this.stack = stack;
    }
  }
}