---
id: architecture-place-appearance
status: proposed
last-reviewed: 2026-10-18
canonical: false
---

# Place appearance and spatial depiction

## Purpose

A meaningful place is more than a coordinate or a City Guide listing. A
Thread's home, a public library or a café needs a visually recognizable
setting, consistent across visits and across independent witnesses. A
picture should help people **see** the World; it must never replace its
actual physical place, claim that a Thread visited, or imply that an
illustrated person or event was present.

## Three separate authorities

1. **Place identity and grounded facts:** World owns the actual place
   reference, name, geography, independently evidenced venue identity and
   affordances. Physical identity does not change when a picture changes.
2. **Visual seed:** World owns a mutable, persistent natural-language
   appearance prompt and a viewpoint. The seed may draw on verified
   architecture/context or an explicitly imaginative private setting.
   Conflicting or unknown real-world geometry is not silently presented
   as documentary fact.
3. **Depiction:** the existing Fibre asset pipeline owns generated image
   bytes, generation provenance, rendering model/version and asset storage.
   World keeps only the chosen asset reference. One generated image is
   an **illustrative representation**, not a geometric scan or a World event.

The October 18 source slice stores an optional `appearance_json` on
`world_public_places`, alongside but independent of `discovery_json` and
the immutable attestation `record_json`. Its fields are `prompt`,
`viewpoint`, `projection` (`perspective` or `equirectangular`) and
`assetRef` (nullable). `POST /internal/world-venues/appearance` and
`npm run world-place -- appearance --env staging --file place.json`
make this a data update rather than a Git/source deployment. The read-only
World Observatory projects the seed and indicates whether a generated
asset has been associated. **Asset generation/delivery is not yet wired.**

### Example

```json
{
  "placeRef": "wpl_authoritative",
  "appearance": {
    "prompt": "A quiet municipal reading room; tall bookshelves, modest wooden tables and natural daylight. No people or text overlays.",
    "viewpoint": "Eye height near the centre of the principal reading room.",
    "projection": "equirectangular",
    "assetRef": null
  }
}
```

Real Lisbon libraries should use individually researched appearance
evidence, not a generic fantasy prompt declared a factual depiction.

## From a 2D image to a spatial look-around

**Recommended first visualization:** generate one **seamless 2:1,
equirectangular 360°×180° interior panorama** and display it with the
lightweight [Pannellum](https://pannellum.org/) viewer. The browser
projects that flat image onto the inside of a virtual sphere, letting
the viewer rotate their head/view direction and zoom. It needs only
one image, and can add linked hotspots between multiple fixed camera
stations. It is a **three-dimensional viewing orientation**, not a
true three-dimensional reconstructed room.

An ordinary perspective photograph cannot simply be wrapped as a
360-degree panorama: unseen walls and the rear hemisphere must be
authored by a panorama-capable generation/conversion pipeline. World
must keep its seed/selected camera station stable if consistent repeat
views are desired; a generated room is not proof of architectural
measurements or traversable collision geometry.

Possible later levels of immersion:

- Several panoramas per place and explicit hotspot connections give
  tour-like movement between known stations, with no inferred geometry.
- A depth map plus a textured mesh can support limited 2.5D parallax,
  with expected occlusion holes and weak unseen-surface fidelity.
- A true spatial representation (mesh, multi-view NeRF/3D Gaussian
  splats or a dedicated generated 3D scene) is warranted only when
  moving through the room, object interaction, physical occlusion, or
  actor position must become causal in Fibre's World. Multi-view
  evidence is preferable to hallucinating the room from one image.

Do not put a 3D engine in World Kernel. Visual representation is an
optional Admin/Meet experience over the existing asset provider.

## Life and occurrence coherence

The scene's visual **baseline** should remain stable enough for
recognition across days; changed light, broken objects, weather,
people, and events are separate time-bound World facts. A new image
must not create those changes retroactively. When a meaningful World
event modifies physical scene state, a later illustrative rendering
can use the admitted facts as overlays or a new visual generation
input; the underlying occurrence and viewer's knowledge remain
distinct.

No background generation simply because a city marker pulses.
Generate lazily once on explicit use or purposeful publication, reuse
the resulting asset across viewers, and do not ask every observing
Thread for a separate image of the same place.

## Coverage and next steps

The present source cut covers **verified public places only**.
Generalizing the visual seed to private homes and Thread-discovered
places is accepted as a needed *capability*, but its data design and
disclosure must preserve per-Thread ownership and existing place
identity. One common per-place visual projection (or uniform table)
can cover all three existing place authorities, without creating
a second place directory. No automatic private location publication.

The next practical demonstration is one attested public venue with
a researched visual seed, one generated panorama stored by the asset
pipeline, and one viewer opening it from the Observatory. This
must not gate the more important autonomous World Event →
perception → voluntary encounter → individual consequence proof.
