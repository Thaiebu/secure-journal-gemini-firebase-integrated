import { describe, it, expect } from 'vitest';
import {
  generateSmartMindfulResponse,
  extractTextFromInput,
  extractKeyThemesFromText,
} from '../../src/smartReflectionEngine';

describe('Smart Reflection Engine Unit Tests', () => {
  it('SRE-01: Correctly recognizes audio/microphone audibility check', () => {
    const userPrompt = 'hi am I audible hi am I audible';
    const response = generateSmartMindfulResponse(userPrompt);
    expect(response.toLowerCase()).toContain('audible');
    expect(response.toLowerCase()).toContain('loud and clear');
    expect(response).toContain('<suggested_title>');
  });

  it('SRE-02: Generates comprehensive, actionable English speaking guidance', () => {
    const userPrompt = 'how can you how can I improve my English speaking skills';
    const response = generateSmartMindfulResponse(userPrompt);
    expect(response).toContain('Shadowing');
    expect(response).toContain('Narrate Your Thoughts Aloud');
    expect(response).toContain('Voice Reflections');
    expect(response).toContain('Mastering English Speaking Skills');
  });

  it('SRE-03: Generates domain-aware response for software engineering / career', () => {
    const userPrompt = 'Thinking about transitioning from SDE to Data Engineering';
    const response = generateSmartMindfulResponse(userPrompt);
    expect(response).toContain('Software');
    expect(response).toContain('pipelines');
  });

  it('SRE-04: Returns valid, tailored JSON insights when systemInstruction requests JSON', () => {
    const prompt = 'Journal Title: Practicing English\nMood: Motivated\nReflection Content: I want to practice speaking English every day.';
    const systemInstruction = 'Return ONLY valid JSON with { title, summary, keyThemes, emotionalTone, takeaways, followUpQuestions, encouragement }';
    const response = generateSmartMindfulResponse(prompt, systemInstruction);
    const parsed = JSON.parse(response);
    expect(parsed.title).toBeDefined();
    expect(parsed.summary).toBeDefined();
    expect(Array.isArray(parsed.keyThemes)).toBe(true);
    expect(parsed.keyThemes.length).toBeGreaterThan(0);
    expect(Array.isArray(parsed.takeaways)).toBe(true);
    expect(Array.isArray(parsed.followUpQuestions)).toBe(true);
  });

  it('SRE-05: Returns JSON array for habit detection', () => {
    const prompt = 'I did 15 minutes of English speaking practice and a morning walk today.';
    const systemInstruction = 'Return ONLY a valid JSON array of short habit names';
    const response = generateSmartMindfulResponse(prompt, systemInstruction);
    const habits = JSON.parse(response);
    expect(Array.isArray(habits)).toBe(true);
    expect(habits).toContain('English Speaking Practice');
    expect(habits).toContain('Morning Walk');
  });

  it('SRE-06: Extracts key themes accurately from text', () => {
    const themes = extractKeyThemesFromText('Practicing English conversation, fluency, and pronunciation');
    expect(themes).toContain('Language Mastery');
    expect(themes).toContain('Spoken Communication');
  });
});
