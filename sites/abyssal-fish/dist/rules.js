export const LEVELS = [
  {name:'Little drifter',size:1,cost:40},
  {name:'Reef explorer',size:1.35,cost:95},
  {name:'Ocean hunter',size:1.8,cost:180},
  {name:'Deep-sea giant',size:2.4,cost:320},
  {name:'Ocean royalty',size:3.2,cost:null}
];
export const SPECIES=[
  {id:'plankton',name:'Plankton',size:.25,points:5,color:0x8fe2ab},
  {id:'shrimp',name:'Shrimp',size:.6,points:10,color:0xf28d80},
  {id:'sardine',name:'Sardine',size:1.1,points:20,color:0x82bbd9},
  {id:'jelly',name:'Jellyfish',size:1.5,points:35,color:0xbd9bea},
  {id:'ray',name:'Manta ray',size:2.1,points:55,color:0x5d9cab},
  {id:'tuna',name:'Tuna',size:2.8,points:80,color:0x7695cb}
];
export const HATS=[{id:'none',name:'Original',cost:0},{id:'beanie',name:'Coral beanie',cost:50},{id:'sailor',name:'Sailor cap',cost:100},{id:'crown',name:'Ocean crown',cost:250}];
export const initialState=()=>({version:1,points:0,level:0,eaten:0,earned:0,owned:['none'],hat:'none'});
export const canEat=(level,creature)=>Number.isInteger(level)&&!!LEVELS[level]&&creature.size<LEVELS[level].size;
export function eat(state,id) {const prey=SPECIES.find(p=>p.id===id); if(!prey||!canEat(state.level,prey))return state; return {...state,points:state.points+prey.points,earned:state.earned+prey.points,eaten:state.eaten+1};}
export function grow(state) {const cost=LEVELS[state.level]?.cost;if(cost==null||state.points<cost)return state;return {...state,points:state.points-cost,level:state.level+1};}
export function equip(state,id) {const hat=HATS.find(h=>h.id===id);if(!hat)return state;if(state.owned.includes(id))return {...state,hat:id};if(state.points<hat.cost)return state;return {...state,points:state.points-hat.cost,owned:[...state.owned,id],hat:id};}
export function restore(raw) {
  try {const s=JSON.parse(raw);if(s?.version!==1)return initialState();const out=initialState();
    for(const k of ['points','earned','eaten'])out[k]=Number.isSafeInteger(s[k])&&s[k]>=0?Math.min(s[k],1e9):0;
    out.level=Number.isInteger(s.level)&&LEVELS[s.level]?s.level:0;
    out.owned=[...new Set(['none',...(Array.isArray(s.owned)?s.owned:[]).filter(id=>HATS.some(h=>h.id===id))])];
    out.hat=out.owned.includes(s.hat)?s.hat:'none';return out;
  }catch{return initialState();}
}
