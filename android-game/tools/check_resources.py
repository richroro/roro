import os, re, glob, sys, xml.etree.ElementTree as ET


def check(mod):
    #!/usr/bin/env python3
    """
    Checks that every resource a module references actually exists.

    aapt only catches this in a full Android build, which is a CI round trip away. A launcher
    icon referencing a colour that was never carried over to a new module is exactly the kind of
    thing that compiles locally and fails in CI, so this runs over the XML as well as the Kotlin.

    Usage: python3 tools/check_resources.py <module> [<module> ...]
    """

    res = f'{mod}/src/main/res'
    have = {}
    for kind, f, tag in (('color','colors.xml','color'), ('string','strings.xml','string'), ('array','arrays.xml','string-array')):
        path = f'{res}/values/{f}'
        have[kind] = {e.get('name') for e in ET.parse(path).getroot() if e.tag == tag} if os.path.exists(path) else set()
    def folder(*names):
        out = set()
        for n in names:
            d = f'{res}/{n}'
            if os.path.isdir(d): out |= {x.rsplit('.',1)[0] for x in os.listdir(d)}
        return out
    have['drawable'] = folder('drawable', 'drawable-nodpi')
    have['raw'] = folder('raw')
    have['mipmap'] = folder('mipmap-anydpi-v26')
    have['style'] = {e.get('name') for e in ET.parse(f'{res}/values/themes.xml').getroot() if e.tag == 'style'} if os.path.exists(f'{res}/values/themes.xml') else set()

    missing = []
    for f in glob.glob(f'{res}/**/*.xml', recursive=True) + [f'{mod}/src/main/AndroidManifest.xml']:
        text = open(f).read()
        # only project refs: @kind/name NOT preceded by android:
        for m in re.finditer(r'@(android:)?(\w+)/([\w.]+)', text):
            if m.group(1): continue                    # framework resource
            kind, name = m.group(2), m.group(3)
            if kind in have and name not in have[kind]:
                missing.append(f'{os.path.relpath(f, mod)} -> @{kind}/{name}')
    for src in glob.glob(f'{mod}/src/main/kotlin/**/*.kt', recursive=True):
        text = open(src).read()
        for kind in ('drawable','raw','color','string','array'):
            for n in set(re.findall(rf'R\.{kind}\.(\w+)', text)):
                if n not in have[kind]: missing.append(f'{os.path.basename(src)} -> R.{kind}.{n}')
    print(f"{mod}: " + ("OK" if not missing else "MISSING " + str(sorted(set(missing)))))
    return not missing


if __name__ == "__main__":
    mods = sys.argv[1:] or ["app", "crowdrush", "skystrike"]
    sys.exit(0 if all([check(m) for m in mods]) else 1)
