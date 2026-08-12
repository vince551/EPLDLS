import { vi, test, expect } from 'vitest';
import React from 'react';

vi.mock('react', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useRef: (initial) => ({ current: initial }),
        useEffect: (fn) => fn?.()
    };
});

import ImageLightbox from '../ImageLightbox.jsx';

test('ImageLightbox: renders nothing when src is null', () => {
    const el = ImageLightbox({ src: null, onClose: () => {} });
    expect(el).toBeNull();
});

test('ImageLightbox: renders nothing when src is undefined', () => {
    const el = ImageLightbox({ src: undefined, onClose: () => {} });
    expect(el).toBeNull();
});

test('ImageLightbox: renders dialog structure when src is provided', () => {
    const testSrc = 'https://example.com/test-img.jpg';
    let closed = false;
    const onClose = () => { closed = true; };

    const el = ImageLightbox({ src: testSrc, onClose });
    expect(el).not.toBeNull();
    expect(el.props.role).toBe('dialog');
    expect(el.props['aria-modal']).toBe('true');

    const children = el.props.children;
    expect(children.length).toBe(2);

    const closeBtn = children[0];
    const imgEl = children[1];

    expect(imgEl.props.src).toBe(testSrc);
    expect(closeBtn.props['aria-label']).toBe('Close Lightbox');

    // Simulate backdrop click
    el.props.onClick();
    expect(closed).toBe(true);
});

test('ImageLightbox: close button triggers onClose with propagation stopped', () => {
    let closed = false;
    let stopped = false;

    const el = ImageLightbox({ src: 'https://example.com/img.png', onClose: () => { closed = true; } });
    const closeBtn = el.props.children[0];

    const fakeEvent = {
        stopPropagation: () => { stopped = true; }
    };

    closeBtn.props.onClick(fakeEvent);
    expect(stopped).toBe(true);
    expect(closed).toBe(true);
});

test('ImageLightbox: clicking image stops propagation to preserve open state', () => {
    let closed = false;
    let stopped = false;

    const el = ImageLightbox({ src: 'https://example.com/img.png', onClose: () => { closed = true; } });
    const imgEl = el.props.children[1];

    const fakeEvent = {
        stopPropagation: () => { stopped = true; }
    };

    imgEl.props.onClick(fakeEvent);
    expect(stopped).toBe(true);
    expect(closed).toBe(false);
});
