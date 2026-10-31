// @vitest-environment node
import { readFileSync } from 'node:fs';

import { createSourceFile, isExportDeclaration, isNamedExports, ScriptTarget } from 'typescript';
import { describe, expect, it } from 'vitest';

const exportedNames = (url: URL): string[] => {
  const source = createSourceFile(url.pathname, readFileSync(url, 'utf8'), ScriptTarget.Latest);
  return source.statements
    .filter(isExportDeclaration)
    .flatMap(statement =>
      statement.exportClause && isNamedExports(statement.exportClause)
        ? statement.exportClause.elements.map(element => element.name.text)
        : [],
    )
    .sort();
};

describe('published React declarations', () => {
  it('preserves every named public export after copying the worker runtime', () => {
    expect(exportedNames(new URL('../dist/index.d.ts', import.meta.url))).toEqual(
      exportedNames(new URL('./index.ts', import.meta.url)),
    );
  });
});
