import { describe, it, expect } from 'vitest'
import { readPage, writePage, deletePage, listPages } from '../src/lib/fileHandler.js'

const pagesDir = () => process.env.PAGES_DIR!

describe('fileHandler', () => {
  describe('readPage', () => {
    it('reads an existing page', async () => {
      const content = await readPage(pagesDir(), 'test')
      expect(content).toBe('Hello World\n')
    })

    it('throws ENOENT for non-existent page', async () => {
      await expect(readPage(pagesDir(), 'nonexistent')).rejects.toThrow()
    })

    it('reads a nested page', async () => {
      const content = await readPage(pagesDir(), 'sub/nested')
      expect(content).toBe('Nested\n')
    })

    it('rejects path traversal', async () => {
      await expect(readPage(pagesDir(), '../../etc/passwd')).rejects.toThrow('Path traversal')
    })

    it('rejects double-dot encoded traversal', async () => {
      await expect(readPage(pagesDir(), '....//....//etc/passwd')).rejects.toThrow()
    })

    it('rejects deep nesting beyond MAX_DEPTH', async () => {
      await expect(readPage(pagesDir(), 'a/b/c/d/e/f')).rejects.toThrow('Path too deep')
    })
  })

  describe('writePage', () => {
    it('creates a new page', async () => {
      await writePage(pagesDir(), 'new-test', 'new content')
      const content = await readPage(pagesDir(), 'new-test')
      expect(content).toBe('new content')
      await deletePage(pagesDir(), 'new-test')
    })

    it('overwrites an existing page', async () => {
      await writePage(pagesDir(), 'test', 'updated content')
      const content = await readPage(pagesDir(), 'test')
      expect(content).toBe('updated content')
      await writePage(pagesDir(), 'test', 'Hello World\n')
    })
  })

  describe('listPages', () => {
    it('lists all .txt files recursively', async () => {
      const pages = await listPages(pagesDir())
      expect(pages).toContain('test')
      expect(pages).toContain('sub/nested')
    })
  })
})
