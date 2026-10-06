# Piece set credits

Four open-licence piece sets were copied unchanged from the Lichess project
(https://github.com/lichess-org/lila, `public/piece/`). The licence for each is as listed in Lichess's
COPYING.md, checked on 2026-10-05. DECISIONS #84.

| Folder | Shown as | Author | Licence |
|---|---|---|---|
| `cburnett/` | Classic flat | Colin M.L. Burnett | GPLv2+ |
| `merida/` | Merida | Armando Hernandez Marroquin | GPLv2+ |
| `chessnut/` | Chessnut | Alexis Luengas | Apache 2.0 |
| `spatial/` | Spatial | Maurizio Monge | MIT |

**Two changes were made to each set**, because the app carries no religious symbols on pieces (DECISIONS #29, #84):
the cross on top of the king was removed, and the cross on the bishop's mitre became a single diagonal cut (the
classic Staunton bishop's mark). Every other piece is unchanged.
- Bishops:
  - cburnett and chessnut: the cross stroke became one diagonal stroke.
  - spatial: the cross (the last sub-shape of the mitre) was removed and a cut drawn.
  - merida: the cross is covered in the mitre's own colour and a cut drawn over it.
- Kings:
  - cburnett: the two cross strokes were deleted, leaving the set's own teardrop finial.
  - merida: the king is clipped above y = 12.05, where the cross ends on its ball finial.
  - chessnut: the white king's cross stroke was deleted. In the black king, the cross section of the outline
  became a straight join.
  - spatial: the cross outline and fill were removed, and a plain ball finial was added.

The other folders (`A`, `B`, `B2`, `C`) are the school's own artwork.
