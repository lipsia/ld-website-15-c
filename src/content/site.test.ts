import { describe, expect, it } from 'vitest';
import { CLIENTS, COMPETENCES, FOOTER, SERVICES, SITE, TECH } from './site';

const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HASH_HREF_PATTERN = /^#[a-z-]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

describe('site.ts content contract', () => {
  describe('IDs are unique and kebab-case', () => {
    it('COMPETENCES.items have unique, kebab-case IDs', () => {
      const ids = COMPETENCES.items.map((item) => item.id);
      expect(ids.length).toBe(new Set(ids).size);
      ids.forEach((id) => {
        expect(id).toMatch(KEBAB_CASE_PATTERN);
      });
    });

    it('SERVICES.items have unique, kebab-case IDs', () => {
      const ids = SERVICES.items.map((item) => item.id);
      expect(ids.length).toBe(new Set(ids).size);
      ids.forEach((id) => {
        expect(id).toMatch(KEBAB_CASE_PATTERN);
      });
    });

    it('TECH.stats have unique, kebab-case IDs', () => {
      const ids = TECH.stats.map((stat) => stat.id);
      expect(ids.length).toBe(new Set(ids).size);
      ids.forEach((id) => {
        expect(id).toMatch(KEBAB_CASE_PATTERN);
      });
    });

    it('CLIENTS.marks have unique, kebab-case IDs', () => {
      const ids = CLIENTS.marks.map((mark) => mark.id);
      expect(ids.length).toBe(new Set(ids).size);
      ids.forEach((id) => {
        expect(id).toMatch(KEBAB_CASE_PATTERN);
      });
    });
  });

  describe('Collection lengths are correct', () => {
    it('COMPETENCES.items has length 3', () => {
      expect(COMPETENCES.items.length).toBe(3);
    });

    it('SERVICES.items has length 4', () => {
      expect(SERVICES.items.length).toBe(4);
    });

    it('TECH.stats has length 2', () => {
      expect(TECH.stats.length).toBe(2);
    });

    it('CLIENTS.marks has length 12', () => {
      expect(CLIENTS.marks.length).toBe(12);
    });
  });

  describe('No empty or whitespace-trimmed strings', () => {
    it('COMPETENCES.items have non-empty title and body', () => {
      COMPETENCES.items.forEach((item) => {
        expect(item.title).not.toBe('');
        expect(item.title).toBe(item.title.trim());
        expect(item.body).not.toBe('');
        expect(item.body).toBe(item.body.trim());
      });
    });

    it('SERVICES.items have non-empty title and body', () => {
      SERVICES.items.forEach((item) => {
        expect(item.title).not.toBe('');
        expect(item.title).toBe(item.title.trim());
        expect(item.body).not.toBe('');
        expect(item.body).toBe(item.body.trim());
      });
    });

    it('TECH strings have no leading/trailing whitespace', () => {
      expect(TECH.title).toBe(TECH.title.trim());
      expect(TECH.lead).toBe(TECH.lead.trim());
      expect(TECH.body).toBe(TECH.body.trim());
      expect(TECH.closing).toBe(TECH.closing.trim());
    });

    it('CLIENTS.title has no leading/trailing whitespace', () => {
      expect(CLIENTS.title).toBe(CLIENTS.title.trim());
    });
  });

  describe('hrefs follow expected patterns', () => {
    it('FOOTER.quickLinks hrefs are valid', () => {
      FOOTER.quickLinks.forEach((link) => {
        expect(link.href === '#' || HASH_HREF_PATTERN.test(link.href)).toBeTruthy();
      });
    });

    it('FOOTER.legalLinks hrefs are valid', () => {
      FOOTER.legalLinks.forEach((link) => {
        expect(link.href === '#' || HASH_HREF_PATTERN.test(link.href)).toBeTruthy();
      });
    });
  });

  describe('SITE data format', () => {
    it('SITE.email matches email pattern', () => {
      expect(SITE.email).toMatch(EMAIL_PATTERN);
    });

    it('SITE.url starts with https://', () => {
      expect(SITE.url).toMatch(/^https:\/\//);
    });
  });

  describe('Typography preservation', () => {
    it('FOOTER.talkLine contains U+2019 (right single quotation mark)', () => {
      // U+2019 is the right single quotation mark
      expect(FOOTER.talkLine).toContain('’');
    });

    it('TECH.body contains EN DASH (U+2013)', () => {
      // U+2013 is the en dash
      expect(TECH.body).toContain('–');
    });
  });

  describe('Service titles are ALL-CAPS', () => {
    it('SERVICES titles are in ALL-CAPS', () => {
      SERVICES.items.forEach((item) => {
        expect(item.title).toBe(item.title.toUpperCase());
      });
    });
  });

  describe('Missing closing periods on SERVICES bodies', () => {
    it('SERVICES items 2-4 have no closing period', () => {
      expect(SERVICES.items[1].body.endsWith('.')).toBe(false);
      expect(SERVICES.items[2].body.endsWith('.')).toBe(false);
      expect(SERVICES.items[3].body.endsWith('.')).toBe(false);
    });

    it('SERVICES item 1 has closing period', () => {
      expect(SERVICES.items[0].body.endsWith('.')).toBe(true);
    });
  });
});
