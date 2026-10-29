import tempfile
import unittest
from pathlib import Path
from engine import validate


class ConfigurationValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        worker = root / 'RVCRealtimeVST' / 'worker'
        worker.mkdir(parents=True)
        (worker / 'rvc_worker.py').touch()
        model = root / 'voice.pth'
        model.touch()
        self.cfg = {'root': str(root), 'model': str(model), 'index': '',
                    'indexRate': 0, 'rate': 48000, 'block': 200}

    def tearDown(self):
        self.temp.cleanup()

    def test_valid_configuration(self):
        root, model = validate(self.cfg)
        self.assertTrue(root.is_dir())
        self.assertEqual(model.name, 'voice.pth')

    def test_empty_root_is_not_current_directory(self):
        self.cfg['root'] = ''
        with self.assertRaisesRegex(ValueError, 'project directory'):
            validate(self.cfg)

    def test_index_mix_requires_index(self):
        self.cfg['indexRate'] = 0.5
        with self.assertRaisesRegex(ValueError, 'requires an index'):
            validate(self.cfg)

    def test_wrong_model_extension(self):
        wrong = Path(self.temp.name) / 'voice.txt'
        wrong.touch()
        self.cfg['model'] = str(wrong)
        with self.assertRaisesRegex(ValueError, 'pth'):
            validate(self.cfg)

    def test_rejects_unreasonable_block(self):
        self.cfg['block'] = 0
        with self.assertRaisesRegex(ValueError, 'block'):
            validate(self.cfg)

if __name__ == '__main__':
    unittest.main()
