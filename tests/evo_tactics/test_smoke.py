import pathlib

def test_dirs_exist():
    assert pathlib.Path('modules/evo-tactics/core').exists()
    assert pathlib.Path('data/evo-tactics/param-synergy').exists()
