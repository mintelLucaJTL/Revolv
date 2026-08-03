namespace RevolvAPI.Data.Seeder
{
    public class DbSeeder
    {
        // Früher wurden hier Demo-Artikel inkl. KI-Empfehlungen in eine eigene
        // 'revolv.Articles'-Tabelle geseedet. Artikel-Stammdaten kommen jetzt direkt aus der
        // echten JTL-WAWI (dbo.tArtikel) - ein automatisches Seeding ergibt hier keinen Sinn
        // mehr, da wir nicht wissen, welche kArtikel-IDs in deiner WAWI tatsächlich existieren.
        //
        // Möchtest du trotzdem Demo-KI-Empfehlungen sehen: lege in deiner WAWI ein paar
        // Testartikel an (oder nutze vorhandene kArtikel-IDs) und füge dann passende
        // AiRecommendation-Zeilen mit deren ArtikelId ein, z.B. über Swagger
        // (POST /api/ai/analyze/{articleId}) oder direkt per SQL.
        public static void Seed(AppDbContext ctx)
        {
            // Bewusst kein automatisches Seeding mehr - siehe Kommentar oben.
        }
    }
}
