# Dotrepo
Helper CLI tool to manage .Net monorepo projects with breeze! 😎

# Installation

```bash
npm install -g dotrepo
```

# Usage

## init
Create a new Dotrepo repo or upgrade an existing repo to the current version of Dotrepo.
```bash
dotrepo init
```

## version
Bump version of packages changed since the last release.
```bash
# Increment version(s) by explicit version _or_ semver keyword:
# 'major', 'premajor', 'minor', 'preminor', 'patch', 'prepatch', or 'prerelease'.
dotrepo version [bump]
```

## build
Run the build command in each project.
```bash
dotrepo build
```

## graph
Generate a dependency graph of the workspace projects.
```bash
dotrepo graph
```
