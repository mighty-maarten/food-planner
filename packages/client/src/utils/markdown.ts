import MarkdownIt from 'markdown-it';

// Raw HTML is disabled, so the output is safe to render with v-html
const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true });

// Links open in a new tab, outside the installed app
const defaultLinkOpen =
    markdown.renderer.rules.link_open ??
    ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));
markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
    tokens[index]?.attrSet('target', '_blank');
    tokens[index]?.attrSet('rel', 'noopener noreferrer');
    return defaultLinkOpen(tokens, index, options, env, self);
};

export function renderMarkdown(text: string): string {
    return markdown.render(text);
}
