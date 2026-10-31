import json,sys,unittest
from pathlib import Path
LAB_ROOT=Path(__file__).resolve().parents[1]; sys.path.insert(0,str(LAB_ROOT))
from ermes_sim import DEFAULT_CONFIG,load_config,run_simulation
from scoring import score_report
class ExternalTests(unittest.TestCase):
    def test_default_runs(self):
        h,r=run_simulation(load_config(DEFAULT_CONFIG)); self.assertGreater(len(h),0); self.assertEqual(r['schema'],'ermes_eco_pressure_report')
    def test_score_bounded(self):
        _,r=run_simulation(load_config(DEFAULT_CONFIG)); s=score_report(r); self.assertGreaterEqual(s,0); self.assertLessEqual(s,1)
    def test_serializable(self):
        _,r=run_simulation(load_config(DEFAULT_CONFIG)); self.assertIn('eco_pressure',json.dumps(r))
if __name__=='__main__': unittest.main()
