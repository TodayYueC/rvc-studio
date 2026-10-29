import tempfile
import unittest
import hashlib
import io
from pathlib import Path
from unittest.mock import patch
import engine
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

    def test_accepts_two_second_block(self):
        self.cfg['block'] = 2000
        validate(self.cfg)

class ModelDownloadTests(unittest.TestCase):
    def test_download_checks_hash_and_reuses_existing_model(self):
        data = b'example model bytes'
        checksum = hashlib.sha256(data).hexdigest()
        with tempfile.TemporaryDirectory() as directory, patch.object(engine, 'DEMO_SHA256', checksum), patch.object(engine.urllib.request, 'urlopen', return_value=io.BytesIO(data)) as fetch:
            path = Path(engine.download_demo(directory))
            self.assertEqual(path.read_bytes(), data)
            self.assertEqual(engine.download_demo(directory), str(path))
            self.assertEqual(fetch.call_count, 1)
            self.assertEqual(list(Path(directory).glob('*.download')), [])

    def test_existing_mismatch_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'V2-AISO-HOWATTO.pth'
            path.write_bytes(b'existing')
            with self.assertRaises(FileExistsError):
                engine.download_demo(directory)
            self.assertEqual(path.read_bytes(), b'existing')

    def test_bad_download_is_not_installed(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(engine.urllib.request, 'urlopen', return_value=io.BytesIO(b'bad bytes')):
            with self.assertRaisesRegex(ValueError, 'checksum'):
                engine.download_demo(directory)
            self.assertEqual(list(Path(directory).iterdir()), [])

if __name__ == '__main__':
    unittest.main()
