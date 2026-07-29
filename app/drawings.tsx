import type { ReactNode } from "react";
import type { ProductArt } from "@/lib/catalog";

/* Monoline technical drawings, one per catalog object.
   The system, held across all of them:
     .d-line   2.00  outline — the object's silhouette
     .d-thin   1.25  construction — seams, ribs, panels, grids
     .d-dash   1.25  dashed — hems, base lines, cut lines
     .d-mark   2.00  exactly one accent lozenge per object
   Every drawing works inside viewBox 0 0 280 210, optically centred near
   (140, 112) and spanning roughly x 60–220 / y 40–190 so the whole grid
   shares one scale. No fills anywhere — stroke does all the work, and
   vector-effect: non-scaling-stroke keeps weights identical from a 3.5rem
   cart thumbnail to a 22rem dialog plate. */
const drawings: Record<ProductArt, ReactNode> = {
  tee: (
    <>
      <path
        className="d-line"
        d="M108 46L88 54L70 96L92 106L98 92L98 170L182 170L182 92L188 106L210 96L192 54L172 46C168 60 112 60 108 46Z"
      />
      <path className="d-thin" d="M111 49C117 63 163 63 169 49" />
      <path className="d-dash" d="M98 161L182 161" />
      <path className="d-mark" d="M118 88L126 80L134 88L126 96Z" />
    </>
  ),

  hoodie: (
    <>
      <path
        className="d-line"
        d="M108 66L86 76L64 124L88 136L96 116L96 182L184 182L184 116L192 136L216 124L194 76L172 66Z"
      />
      <path
        className="d-line"
        d="M104 66C102 40 178 40 176 66L158 66C154 92 126 92 122 66Z"
      />
      <path className="d-thin" d="M132 88L130 118M148 88L150 118" />
      <path className="d-thin" d="M108 142L172 142L172 172L108 172Z" />
      <path className="d-thin" d="M90 130L98 126M182 126L190 130" />
      <path className="d-dash" d="M96 176L184 176" />
      <path className="d-mark" d="M112 108L120 100L128 108L120 116Z" />
    </>
  ),

  cap: (
    <>
      <path
        className="d-line"
        d="M70 138C70 88 102 62 140 62C178 62 210 88 210 138Z"
      />
      <path
        className="d-line"
        d="M58 138C58 156 94 168 140 168C186 168 222 156 222 138Z"
      />
      <path className="d-thin" d="M140 62L140 138" />
      <path className="d-thin" d="M103 70C110 96 110 118 107 138" />
      <path className="d-thin" d="M177 70C170 96 170 118 173 138" />
      <path
        className="d-thin"
        d="M61 145C72 160 102 166 140 166C178 166 208 160 219 145"
      />
      <circle className="d-thin" cx="140" cy="60" r="4" />
      <path className="d-mark" d="M132 108L140 100L148 108L140 116Z" />
    </>
  ),

  socks: (
    <>
      <path
        className="d-line"
        d="M88 50L118 50L118 132C118 140 124 144 134 144L148 144C158 144 158 168 148 168L88 168Z"
      />
      <path
        className="d-line"
        d="M132 62L162 62L162 140C162 148 168 152 178 152L192 152C202 152 202 176 192 176L132 176Z"
      />
      <path className="d-thin" d="M88 60L118 60M88 68L118 68" />
      <path className="d-thin" d="M132 72L162 72M132 80L162 80" />
      <path className="d-dash" d="M140 148L140 164M184 156L184 172" />
      <path className="d-mark" d="M96 96L103 88L110 96L103 104Z" />
    </>
  ),

  beanie: (
    <>
      <path
        className="d-line"
        d="M84 132C84 82 100 54 140 54C180 54 196 82 196 132Z"
      />
      <path className="d-line" d="M78 132L202 132L202 164L78 164Z" />
      <path
        className="d-thin"
        d="M96 136L96 160M114 136L114 160M132 136L132 160M150 136L150 160M168 136L168 160M186 136L186 160"
      />
      <path className="d-thin" d="M108 130C106 96 118 66 140 66" />
      <path className="d-thin" d="M172 130C174 96 162 66 140 66" />
      <circle className="d-line" cx="140" cy="46" r="8" />
      <path className="d-mark" d="M132 100L140 92L148 100L140 108Z" />
    </>
  ),

  jacket: (
    <>
      <path
        className="d-line"
        d="M106 58L86 68L66 120L90 132L98 112L98 180L182 180L182 112L190 132L214 120L194 68L174 58L140 66Z"
      />
      <path className="d-line" d="M106 58L126 76L140 66L154 76L174 58" />
      <path className="d-line" d="M140 66L140 180" />
      <circle className="d-thin" cx="140" cy="98" r="2.5" />
      <circle className="d-thin" cx="140" cy="120" r="2.5" />
      <circle className="d-thin" cx="140" cy="142" r="2.5" />
      <path className="d-thin" d="M108 140L132 140L132 162L108 162Z" />
      <path className="d-thin" d="M148 140L172 140L172 162L148 162Z" />
      <path className="d-thin" d="M90 126L98 122M182 122L190 126" />
      <path className="d-dash" d="M98 172L182 172" />
      <path className="d-mark" d="M112 92L120 84L128 92L120 100Z" />
    </>
  ),

  tote: (
    <>
      <path className="d-line" d="M78 84L202 84L214 182L66 182Z" />
      <path className="d-line" d="M102 84C102 40 178 40 178 84" />
      <path className="d-thin" d="M114 84C114 52 166 52 166 84" />
      <path className="d-thin" d="M77 96L203 96" />
      <path className="d-dash" d="M70 172L210 172" />
      <path className="d-mark" d="M130 132L140 120L150 132L140 144Z" />
    </>
  ),

  bottle: (
    <>
      <path
        className="d-line"
        d="M124 66C122 82 106 94 106 112L106 166C106 176 174 176 174 166L174 112C174 94 158 82 156 66Z"
      />
      <path className="d-line" d="M120 40L160 40L160 66L120 66Z" />
      <path className="d-thin" d="M124 47L156 47M124 55L156 55" />
      <path className="d-thin" d="M112 90L168 90" />
      <path className="d-dash" d="M106 134L174 134" />
      <path className="d-mark" d="M132 108L140 98L148 108L140 118Z" />
    </>
  ),

  backpack: (
    <>
      <path
        className="d-line"
        d="M86 96C86 68 106 52 140 52C174 52 194 68 194 96L194 174L86 174Z"
      />
      <path className="d-line" d="M104 120L176 120L176 162L104 162Z" />
      <path className="d-line" d="M126 54C126 40 154 40 154 54" />
      <path className="d-thin" d="M104 128L176 128" />
      <path className="d-thin" d="M90 100C110 92 170 92 190 100" />
      <path className="d-dash" d="M92 168L188 168" />
      <path className="d-mark" d="M132 96L140 88L148 96L140 104Z" />
    </>
  ),

  duffel: (
    <>
      <path
        className="d-line"
        d="M96 92L184 92C202 92 210 106 210 126C210 146 202 160 184 160L96 160C78 160 70 146 70 126C70 106 78 92 96 92Z"
      />
      <path className="d-thin" d="M96 92C88 100 86 112 86 126C86 140 88 152 96 160" />
      <path className="d-thin" d="M100 104L188 104" />
      <path className="d-line" d="M118 96C118 74 162 74 162 96" />
      <path className="d-thin" d="M128 96C128 84 152 84 152 96" />
      <path className="d-dash" d="M100 152L180 152" />
      <path className="d-mark" d="M132 120L140 112L148 120L140 128Z" />
    </>
  ),

  pouch: (
    <>
      <path className="d-line" d="M80 106L200 106L190 170L90 170Z" />
      <path className="d-dash" d="M86 112L194 112" />
      <path className="d-thin" d="M88 120L192 120" />
      <path className="d-thin" d="M200 100L214 100L214 112L200 112Z" />
      <path className="d-thin" d="M94 162L186 162" />
      <path className="d-mark" d="M132 136L140 128L148 136L140 144Z" />
    </>
  ),

  /* A closed neck loop reads as a lanyard; two bare diagonals read as a V. */
  lanyard: (
    <>
      <path className="d-line" d="M140 46C110 46 92 84 106 118L118 138" />
      <path className="d-line" d="M140 46C170 46 188 84 174 118L162 138" />
      <path className="d-thin" d="M140 58C118 58 104 88 116 116L126 134" />
      <path className="d-thin" d="M140 58C162 58 176 88 164 116L154 134" />
      <path className="d-line" d="M124 138L156 138L156 150L124 150Z" />
      <path className="d-line" d="M104 150L176 150L176 194L104 194Z" />
      <path className="d-thin" d="M128 158L152 158" />
      <path className="d-mark" d="M130 176L140 166L150 176L140 186Z" />
    </>
  ),

  mug: (
    <>
      <path className="d-line" d="M84 78L84 156C84 174 172 174 172 156L172 78" />
      <path className="d-line" d="M84 78C84 66 172 66 172 78C172 90 84 90 84 78Z" />
      <path className="d-line" d="M172 98C212 94 214 144 172 140" />
      <path className="d-thin" d="M172 108C199 105 201 131 172 129" />
      <path className="d-dash" d="M89 166L167 166" />
      <path className="d-mark" d="M120 120L128 110L136 120L128 130Z" />
    </>
  ),

  notebook: (
    <>
      <path className="d-line" d="M96 46L198 46L198 180L96 180Z" />
      <path className="d-thin" d="M198 51L207 56L207 175L198 180" />
      <path className="d-thin" d="M111 46L111 180" />
      <path className="d-line" d="M175 46L175 180" />
      <path className="d-mark" d="M132 106L142 94L152 106L142 118Z" />
    </>
  ),

  pins: (
    <>
      <circle className="d-line" cx="98" cy="138" r="30" />
      <circle className="d-line" cx="140" cy="84" r="30" />
      <circle className="d-line" cx="188" cy="136" r="30" />
      <circle className="d-thin" cx="98" cy="138" r="21" />
      <circle className="d-thin" cx="140" cy="84" r="21" />
      <circle className="d-thin" cx="188" cy="136" r="21" />
      <path className="d-thin" d="M91 138L98 130L105 138L98 146Z" />
      <path className="d-thin" d="M181 136L188 128L195 136L188 144Z" />
      <path className="d-mark" d="M133 84L140 76L147 84L140 92Z" />
    </>
  ),

  keycaps: (
    <>
      <path className="d-line" d="M78 96L118 96L118 136L78 136Z" />
      <path className="d-line" d="M124 96L164 96L164 136L124 136Z" />
      <path className="d-line" d="M170 96L210 96L210 136L170 136Z" />
      <path className="d-line" d="M98 142L138 142L138 182L98 182Z" />
      <path className="d-line" d="M144 142L184 142L184 182L144 182Z" />
      <path className="d-thin" d="M85 103L111 103L111 129L85 129Z" />
      <path className="d-thin" d="M177 103L203 103L203 129L177 129Z" />
      <path className="d-thin" d="M105 149L131 149L131 175L105 175Z" />
      <path className="d-thin" d="M151 149L177 149L177 175L151 175Z" />
      <path className="d-mark" d="M136 116L144 108L152 116L144 124Z" />
    </>
  ),

  deskmat: (
    <>
      <path className="d-line" d="M64 104L196 104L196 168L64 168Z" />
      <path className="d-line" d="M196 104C216 104 216 168 196 168" />
      <path className="d-dash" d="M72 112L188 112L188 160L72 160Z" />
      <path className="d-thin" d="M206 116C210 126 210 146 206 156" />
      <path className="d-mark" d="M122 128L130 120L138 128L130 136Z" />
    </>
  ),

  /* Drawn as a run, not a coil — a coiled cable at cell size reads as a
     donut or a magnifier. Two parallel curves give it width; the accent sits
     inside the upper connector, which drops its slot detail to make room. */
  cable: (
    <>
      <path className="d-line" d="M88 166C88 130 118 136 134 114C152 90 182 94 186 66" />
      <path className="d-line" d="M104 166C104 134 132 142 148 120C164 98 194 102 198 66" />
      <path className="d-line" d="M78 166L114 166L114 192L78 192Z" />
      <path className="d-line" d="M176 34L216 34L216 66L176 66Z" />
      <path className="d-thin" d="M86 179L106 179" />
      <path className="d-thin" d="M86 156L106 156L106 166L86 166Z" />
      <path className="d-mark" d="M188 50L196 42L204 50L196 58Z" />
    </>
  ),

  poster: (
    <>
      <path className="d-line" d="M92 44L188 44L188 176L92 176Z" />
      <path className="d-thin" d="M102 54L178 54L178 166L102 166Z" />
      <circle className="d-line" cx="140" cy="88" r="24" />
      <path className="d-thin" d="M102 120L178 120" />
      <path className="d-thin" d="M110 132L170 132M110 142L152 142M110 152L162 152" />
      <path className="d-mark" d="M132 88L140 80L148 88L140 96Z" />
    </>
  ),

  sticker: (
    <>
      <path className="d-line" d="M76 60L204 60L204 160L76 160Z" />
      <path className="d-dash" d="M84 68L196 68L196 152L84 152Z" />
      <circle className="d-line" cx="106" cy="90" r="15" />
      <path className="d-line" d="M126 75L156 75L156 105L126 105Z" />
      <circle className="d-line" cx="106" cy="130" r="15" />
      <path className="d-line" d="M126 115L156 115L156 145L126 145Z" />
      <path className="d-thin" d="M176 130L188 118L200 130L188 142Z" />
      <path className="d-mark" d="M176 90L188 78L200 90L188 102Z" />
    </>
  ),

  zine: (
    <>
      <path className="d-line" d="M70 70L138 56L138 168L70 178Z" />
      <path className="d-line" d="M142 56L210 70L210 178L142 168Z" />
      <path className="d-line" d="M136 88L144 88M136 130L144 130" />
      <path className="d-thin" d="M82 92L126 88M82 104L126 100M82 116L112 112" />
      <path className="d-thin" d="M154 88L198 92M154 100L198 104M154 112L184 116" />
      <path className="d-mark" d="M92 142L100 134L108 142L100 150Z" />
    </>
  ),

  postcards: (
    <>
      <path className="d-line" d="M92 70L206 70L206 152L92 152Z" />
      <path className="d-line" d="M78 88L192 88L192 170L78 170Z" />
      <path className="d-thin" d="M160 96L184 96L184 118L160 118Z" />
      <path className="d-thin" d="M136 96L136 162" />
      <path className="d-thin" d="M144 132L184 132M144 144L172 144" />
      <path className="d-mark" d="M98 122L108 112L118 122L108 132Z" />
    </>
  ),

  tape: (
    <>
      <circle className="d-line" cx="130" cy="110" r="58" />
      <circle className="d-line" cx="130" cy="110" r="24" />
      <circle className="d-thin" cx="130" cy="110" r="50" />
      <circle className="d-thin" cx="130" cy="110" r="40" />
      <path className="d-line" d="M188 110C208 118 214 140 210 166" />
      <path className="d-line" d="M186 124C202 130 206 148 202 168" />
      <path className="d-thin" d="M210 166L202 168" />
      <path className="d-mark" d="M122 110L130 102L138 110L130 118Z" />
    </>
  ),

  calendar: (
    <>
      <path className="d-line" d="M84 62L196 62L196 176L84 176Z" />
      <path className="d-line" d="M84 62L196 62L196 90L84 90Z" />
      <circle className="d-thin" cx="112" cy="76" r="4" />
      <circle className="d-thin" cx="168" cy="76" r="4" />
      <path className="d-thin" d="M112 90L112 176M140 90L140 176M168 90L168 176" />
      <path className="d-thin" d="M84 112L196 112M84 134L196 134M84 156L196 156" />
      <path className="d-mark" d="M146 123L154 115L162 123L154 131Z" />
    </>
  ),
};

export function TechnicalDrawing({ kind }: { kind: ProductArt }) {
  return (
    <svg
      className="drawing"
      viewBox="0 0 280 210"
      role="img"
      aria-label={`${kind} technical drawing`}
    >
      {drawings[kind]}
    </svg>
  );
}
