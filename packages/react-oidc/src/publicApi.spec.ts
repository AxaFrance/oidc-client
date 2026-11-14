// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import {
  createProgram,
  createSourceFile,
  flattenDiagnosticMessageText,
  getPreEmitDiagnostics,
  isExportDeclaration,
  isImportDeclaration,
  isNamedExports,
  isNamedImports,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
} from 'typescript';
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
  it('keeps the legacy core runtime exports in ESM and CommonJS builds', async () => {
    const fixture = new URL('../fixtures/legacy-core-consumer.ts', import.meta.url);
    const source = createSourceFile(
      fixture.pathname,
      readFileSync(fixture, 'utf8'),
      ScriptTarget.Latest,
    );
    const names = source.statements.filter(isImportDeclaration).flatMap(statement => {
      const bindings = statement.importClause?.namedBindings;
      return bindings && isNamedImports(bindings)
        ? bindings.elements.filter(element => !element.isTypeOnly).map(element => element.name.text)
        : [];
    });
    const esm = await import(new URL('../../oidc-client/dist/index.js', import.meta.url).href);
    const commonjs = createRequire(import.meta.url)(
      fileURLToPath(new URL('../../oidc-client/dist/index.umd.cjs', import.meta.url)),
    );
    expect(Object.keys(esm)).toEqual(expect.arrayContaining(names));
    expect(Object.keys(commonjs)).toEqual(expect.arrayContaining(names));
  });

  it.each([ModuleResolutionKind.Bundler, ModuleResolutionKind.NodeNext])(
    'type-checks pre-resource consumers with module resolution %s',
    moduleResolution => {
      const fixtures = ['core', 'react', 'protocol'].map(name =>
        fileURLToPath(new URL(`../fixtures/legacy-${name}-consumer.ts`, import.meta.url)),
      );
      const program = createProgram(fixtures, {
        target: ScriptTarget.ES2021,
        module:
          moduleResolution === ModuleResolutionKind.NodeNext
            ? ModuleKind.NodeNext
            : ModuleKind.ESNext,
        moduleResolution,
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        esModuleInterop: true,
        types: [],
      });
      const errors = getPreEmitDiagnostics(program).map(
        diagnostic =>
          `${diagnostic.file?.fileName ?? ''}: ${flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
      );
      expect(errors).toEqual([]);
    },
    30_000,
  );

  it('preserves every named public export after copying the worker runtime', () => {
    expect(exportedNames(new URL('../dist/index.d.ts', import.meta.url))).toEqual(
      exportedNames(new URL('./index.ts', import.meta.url)),
    );
  });
});
