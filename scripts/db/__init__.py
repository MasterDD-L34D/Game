"""Pacchetto di supporto per gli script legati al database."""

import sys

from . import config_loader as _config_loader

# Gli script della cartella erano pensati per essere eseguiti come moduli
# stand-alone e importano ``config_loader`` come modulo di primo livello. Qui
# pubblichiamo lo stesso modulo in ``sys.modules`` così che gli import esistenti
# continuino a funzionare anche quando il pacchetto viene importato.
sys.modules.setdefault("config_loader", _config_loader)

__all__ = ["_config_loader"]
