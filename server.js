require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// GET: Récupérer les données actives
app.get('/api/offers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM active_pipeline_offers ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Ajouter une nouvelle offre
app.post('/api/offers', async (req, res) => {
    const d = req.body;
    const query = `
        INSERT INTO pipeline_offers 
        (client, ref, contact, email, details, formation, hackerspace, nb_part, pause_par_jour, formateur_par_heure, frais_transport, heures_par_jour, nb_jours, formateur, priorite, statut, montant_ht, date_depot, date_demarrage)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *;
    `;
    const values = [
        d.client, d.ref, d.contact, d.email, d.details, d.formation, d.hackerspace,
        d.nb_part || 1, d.pause_par_jour || 0, d.formateur_par_heure || 0, d.frais_transport || 0,
        d.heures_par_jour || 6, d.nb_jours || 1, d.formateur, d.priorite || 'Moyenne',
        d.statut || 'En Préparation Logistique', d.montant_ht || 0,
        d.date_depot || null, d.date_demarrage || null
    ];
    try {
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT: Modifier une offre existante
app.put('/api/offers/:id', async (req, res) => {
    const { id } = req.params;
    const d = req.body;
    const query = `
        UPDATE pipeline_offers SET
            client=$1, ref=$2, contact=$3, email=$4, details=$5, formation=$6, hackerspace=$7,
            nb_part=$8, pause_par_jour=$9, formateur_par_heure=$10, frais_transport=$11,
            heures_par_jour=$12, nb_jours=$13, formateur=$14, priorite=$15, statut=$16,
            montant_ht=$17, date_depot=$18, date_demarrage=$19, updated_at=NOW()
        WHERE id=$20 AND deleted_at IS NULL
        RETURNING *;
    `;
    const values = [
        d.client, d.ref, d.contact, d.email, d.details, d.formation, d.hackerspace,
        d.nb_part, d.pause_par_jour, d.formateur_par_heure, d.frais_transport,
        d.heures_par_jour, d.nb_jours, d.formateur, d.priorite, d.statut, d.montant_ht,
        d.date_depot || null, d.date_demarrage || null, id
    ];
    try {
        const result = await pool.query(query, values);
        if (result.rowCount === 0) return res.status(404).json({ error: "Offre introuvable" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: Soft delete (Archivage sans suppression physique)
app.delete('/api/offers/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('UPDATE pipeline_offers SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Offre introuvable" });
        res.json({ message: "Offre masquée avec succès (Soft delete)" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur prêt sur http://localhost:${PORT}`));