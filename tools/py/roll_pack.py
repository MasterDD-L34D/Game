import sys, random, yaml, json

def in_range(val, r):
    if '-' in r:
        a,b = map(int, r.split('-'))
        return a <= val <= b
    return val == int(r)

def roll_pack(form, job, data_path='../../data/packs.yaml'):
    with open(data_path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)

    d20 = random.randint(1,20)
    general = next(x for x in data['random_general_d20'] if in_range(d20, x['range']))

    def choose_bias_form():
        d12 = random.randint(1,12)
        bias = data['forms'][form]['bias_d12']
        packKey = next(k for k,r in bias.items() if in_range(d12, r))
        return packKey, data['forms'][form][packKey]

    if general['pack'] == 'BIAS_FORMA':
        pack, combo = choose_bias_form()
    elif general['pack'] == 'BIAS_JOB':
        job_bias = {
            'vanguard':['B','D'],'skirmisher':['C','E'],'warden':['E','G'],
            'artificer':['A','F'],'invoker':['A','J'],'harvester':['D','J']
        }
        pref = job_bias.get(job.lower(), ['A','B'])
        first = next(x for x in data['random_general_d20'] if x['pack'] in pref)
        pack, combo = first['pack'], first['combo']
    elif general['pack'] == 'SCELTA':
        first = next(x for x in data['random_general_d20'] if x['pack']=='A')
        pack, combo = 'A', first['combo']
    else:
        pack, combo = general['pack'], general['combo']

    shop = data['pi_shop']['costs']
    def cost(key):
        return (
            shop['trait_T1'] if str(key).startswith('trait_T1') else
            shop['job_ability'] if str(key).startswith('job_ability') else
            shop['cap_pt'] if key=='cap_pt' else
            shop['guardia_situazionale'] if key=='guardia_situazionale' else
            shop['starter_bioma'] if key=='starter_bioma' else
            shop['sigillo_forma'] if key=='sigillo_forma' else
            1 if key=='PE' else 0
        )
    total = sum(cost(k) for k in combo)
    assert total==7, f"Pacchetto {pack} = {total}"
    assert combo.count('cap_pt')<=1
    assert combo.count('starter_bioma')<=1
    return {'d20': d20, 'pack': pack, 'combo': combo}

if __name__ == '__main__':
    form = sys.argv[1] if len(sys.argv)>1 else 'ENTP'
    job = sys.argv[2] if len(sys.argv)>2 else 'invoker'
    data_path = sys.argv[3] if len(sys.argv)>3 else '../../data/packs.yaml'
    res = roll_pack(form, job, data_path)
    print(json.dumps(res, ensure_ascii=False, indent=2))
