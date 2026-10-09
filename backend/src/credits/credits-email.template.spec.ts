import {
  renderCreditsEmail,
  creditsSubject,
  firstNameOf,
} from './credits-email.template';

const base = {
  firstName: 'Ayesha',
  eventTitle: 'Build with AI',
  claimUrl: 'https://x.test/api/public/credits/tok/claim',
  videoUrl: 'https://x.test/api/public/credits/tok/video',
  confirmUrl: 'https://x.test/credits/tok',
  thumbnailUrl: 'https://x.test/images/credits-video-thumb.png',
};

describe('renderCreditsEmail', () => {
  it('escapes every interpolated value in the HTML', () => {
    const { html } = renderCreditsEmail({
      ...base,
      firstName: '<b>Eve</b>',
      eventTitle: '"><script>alert(1)</script>',
      claimUrl: 'https://x.test/?a=1&b="2"',
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>Eve</b>');
    expect(html).toContain('&lt;b&gt;Eve&lt;/b&gt;');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
    expect(html).toContain('a=1&amp;b=&quot;2&quot;');
  });

  it('includes the video block only when a video URL is set', () => {
    expect(renderCreditsEmail(base).html).toContain(base.thumbnailUrl);
    const without = renderCreditsEmail({ ...base, videoUrl: null });
    expect(without.html).not.toContain(base.thumbnailUrl);
    expect(without.html).not.toContain('walkthrough');
    expect(without.text).not.toContain('walkthrough');
  });

  it('has the claim and confirm buttons and a plain-text part', () => {
    const { html, text } = renderCreditsEmail(base);
    expect(html).toContain(`href="${base.claimUrl}"`);
    expect(html).toContain(`href="${base.confirmUrl}"`);
    expect(text).toContain(base.claimUrl);
    expect(text).toContain(base.confirmUrl);
    expect(text).toContain('GDP Credit');
  });
});

describe('creditsSubject / firstNameOf', () => {
  it('builds the subject on one line', () => {
    expect(creditsSubject('Build\nwith AI')).toBe(
      'Claim your Google Cloud credits – Build with AI',
    );
  });

  it('takes the first word of the name', () => {
    expect(firstNameOf('  Ayesha  Khan ')).toBe('Ayesha');
    expect(firstNameOf('')).toBe('there');
  });
});
