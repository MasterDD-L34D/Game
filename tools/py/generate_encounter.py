import sys, yaml, json, random

def generate(biome_key, path='../../data/biomes.yaml', party_power=20, party_vc=None):
    with open(path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    biome = data['biomes'][biome_key]
    diff_base = biome['diff_base']
    mod = biome['mod_biome']
    affixes = biome['affixes']
    vc = party_vc or {'aggro':'low','cohesion':'mid','setup':'mid','explore':'low','risk':'mid'}
    # Threat Budget semplice
    TB = party_power + diff_base + mod
    # Distribuzione gruppi
    groups = []
    remaining = TB
    while remaining > 0:
        chunk = min(7, remaining)  # gruppo da 7 power max
        role = random.choice(['front','skirm','control','support','objective'])
        aff = random.sample(affixes, k=min(2, len(affixes)))
        groups.append({'power': chunk, 'role': role, 'affixes': aff})
        remaining -= chunk
    return {'biome': biome_key, 'TB': TB, 'groups': groups}

if __name__ == '__main__':
    biome = sys.argv[1] if len(sys.argv)>1 else 'savana'
    path = sys.argv[2] if len(sys.argv)>2 else '../../data/biomes.yaml'
    res = generate(biome, path)
    print(json.dumps(res, ensure_ascii=False, indent=2))
