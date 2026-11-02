"""Derive browser-specific manifests from the shared Firefox source manifest."""
from copy import deepcopy


def browser_manifest(source, browser):
    manifest = deepcopy(source)
    if browser == 'chrome':
        manifest.pop('browser_specific_settings', None)
        manifest['background'] = {'service_worker': 'extension-background.js'}
    elif browser != 'firefox':
        raise ValueError(f'Unsupported browser: {browser}')
    return manifest
