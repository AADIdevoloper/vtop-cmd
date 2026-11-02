"""Derive browser-specific manifests from the shared Firefox source manifest."""
from copy import deepcopy


def browser_manifest(source, browser):
    manifest = deepcopy(source)
    if browser == 'chrome':
        manifest.pop('browser_specific_settings', None)
        manifest['background'] = {'service_worker': 'extension-background.js'}
        # Chrome MV3 rejects blob: in executable-code directives, including worker-src.
        policy = manifest['content_security_policy']['extension_pages']
        manifest['content_security_policy']['extension_pages'] = '; '.join(
            "worker-src 'self'" if rule.strip().split()[0] == 'worker-src' else rule.strip()
            for rule in policy.split(';') if rule.strip()
        ) + ';'
    elif browser != 'firefox':
        raise ValueError(f'Unsupported browser: {browser}')
    return manifest
