// How a memory is held in the background of a job that is not about it: by
// its gist, the Thread's own short version written when the memory formed.
// The full recollection stays authoritative and is what reflection, recall
// and inspection read. A memory formed before gists existed is held in full.
export function memoryInMind(memory){
  return typeof memory.gist==="string"
    ?{gist:memory.gist}
    :{rememberedContent:memory.rememberedContent??null,rememberedMeaning:memory.rememberedMeaning??null};
}
