# Evo enum review

## Diff summary

```text
Enum differences:
- ecotype_cluster:
    + added: 'Canopy Ombrosa', 'Canyon Notturno', 'Cavernicolo', 'Cenge Calcarenitiche', 'Chioma Elettrofilo', 'Chioma Umida', 'Dorsali Ventose', 'Estuario Torbido', 'Forre Umide', 'Gole Ventose', 'Laguna Quieta', 'Letti Fluviali', 'Oasi Termica', 'Pianure Ventose', 'Prateria Arbustiva', 'Radura Acida', 'Radura Notturna', 'Savanicola Notturno', 'Stagno Quieto', 'Torrente Lento'
    - removed: 'Canopy', 'Canyon', 'Estuario', 'Laguna', 'Prateria'
- habitat_profile:
    + added: 'corsi d’acqua e coste sabbiose', 'falesie e praterie montane', 'foreste e sistemi carsici', 'foreste pluviali e canyon notturni', 'foreste tropicali', "foreste umide con corsi d'acqua", 'savana calda con gole rocciose', 'savanes e bacini termici', 'steppe e savane aperte', 'zone umide, acque dolci'
    - removed: 'ambienti costieri', 'foreste temperate', 'savana', 'steppe', 'zone umide'
- macro_class:
    + added: 'Artropode', 'Mammalo-artropode', 'Protista complesso', 'Reptilia/Pisces'
    - removed: 'Amphibia'
- metric_unit:
    + added: '1/season', 'Cel', 'Hz', 'J', 'K', 'K/W', 'L', 'L/min', 'Pa', 'T', 'V', 'W/kg', 'dB', 'dB·s', 'm/s', 'm/s2', 'mm'
    - removed: 'kg'
- sentience_tier:
    + added: 'T5', 'T6'
```

## Notes

- Il team gameplay ha richiesto un follow-up per validare i nuovi `metric_unit` introdotti dal pacchetto Evo.
- Nessun cambiamento sul range `danger_level` rispetto al dataset core.
