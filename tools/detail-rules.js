// 원본 메시 조각 이름을 세분화한 부위 id로 옮기는 규칙. build-detail.js(남성)와 build-detail-f.js(여성)가 함께 쓴다.
// 각 묶음(크게 단계 id)마다 [정규식, 세부 id] 를 위에서부터 검사하고, 맞는 것이 없으면 묶음 id를 그대로 쓴다.
// 세부 id의 이름, 단계, 설명은 medical-wordbook.html 의 SUBS 에 있다.
const NUM = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12 };
const vert = (g, name) => { if (/atlas/.test(name)) return g + '_1'; if (/axis/.test(name)) return g + '_2'; const m = name.match(/^(\w+) (cervical|thoracic|lumbar)/); return m && NUM[m[1]] ? g + '_' + NUM[m[1]] : g; };
const rib = name => { if (/costal cartilage/.test(name)) return 'rib_cart'; const m = name.match(/(\w+) rib$/); const n = m && NUM[m[1]]; return !n ? 'ribs' : n <= 7 ? 'rib_true' : n <= 10 ? 'rib_false' : 'rib_float'; };

const R = {
  skull: [[/frontal bone/, 'sk_fr'], [/parietal/, 'sk_pa'], [/temporal/, 'sk_te'], [/occipital/, 'sk_oc'], [/sphenoid/, 'sk_sp'], [/ethmoid/, 'sk_et'],
    [/zygomatic/, 'sk_zy'], [/maxilla/, 'sk_mx'], [/nasal bone/, 'sk_na'], [/lacrimal/, 'sk_la'], [/palatine/, 'sk_pl'], [/concha/, 'sk_co'], [/vomer/, 'sk_vo']],
  ster: [[/manubrium/, 'ster_m'], [/body of sternum/, 'ster_b'], [/xiphoid/, 'ster_x']],
  hand: [[/scaphoid/, 'hand_sca'], [/lunate/, 'hand_lun'], [/triquetral/, 'hand_tri'], [/pisiform/, 'hand_pis'], [/trapezium/, 'hand_trm'], [/trapezoid/, 'hand_trd'],
    [/capitate/, 'hand_cap'], [/hamate/, 'hand_ham'], [/metacarpal/, 'hand_meta'], [/proximal phalanx/, 'hand_px'], [/middle phalanx/, 'hand_mid'], [/distal phalanx/, 'hand_dis']],
  foot: [[/talus/, 'foot_tal'], [/calcaneus/, 'foot_cal'], [/navicular/, 'foot_nav'], [/cuboid/, 'foot_cub'], [/cuneiform/, 'foot_cun'], [/metatarsal|sesamoid/, 'foot_meta'],
    [/proximal phalanx/, 'foot_px'], [/middle phalanx/, 'foot_mid'], [/distal phalanx/, 'foot_dis']],
  brain: [
    // 여성(Allen) 이름과 남성(BodyParts3D) 이름을 함께 다룬다
    [/HTH|hypothalamus|subthalamic|tuber cinereum|mammillary body|mammillary_body/, 'brain_hy'], [/pineal/, 'brain_pin'], [/pituitary/, 'brain_pit'],
    [/ventricle|ventricular|horn_of_lateral|atrium_of_lateral|aqueduct|central_canal|choroid plexus/, 'brain_ve'],
    [/cerebell|paravermis|white_matter_of_hindbrain/, 'brain_cb'],
    [/pons|pontine/, 'brain_po'], [/medulla|inferior_olive/, 'brain_me'],
    [/midbrain|red_nucleus|peduncle of midbrain|cerebral_peduncle|colliculus|interpeduncular|substantia_nigra|pretectal/, 'brain_mb'],
    [/thalam|geniculate|habenul|stria medullaris|midline_nuclear|zona_incerta|ventral_posterior/, 'brain_th'],
    [/caudate|putamen|accumbens|pallidus|claustrum|basal_forebrain/, 'brain_bg'],
    [/cingul|parahippocampal|hippocamp|amygd|central_nuclear_group|lateral_nucleus|basolateral|basomedial|cortical_nucleus|medial_nucleus|fornix|stria.terminalis|septal|septum pellucidum|subcallosal|gyrus_ambiens|olfactory|piriform|mammillothalamic/, 'brain_li'],
    [/insula|accessory short gyrus/, 'brain_in'],
    [/frontal|frontomarginal|precentral|primary_motor|orbital|rectus|straight gyrus|paracentral_lobule_rostral|paracingulate|rostral_gyrus/, 'brain_fr'],
    [/postcentral|parietal|supramarginal|angular|precuneus|paracentral_lobule_caudal/, 'brain_pa'],
    [/fusiform_gyrus_temporal|perirhinal/, 'brain_te'], [/occipital|cuneus|lingual/, 'brain_oc'],
    [/temporal|fusiform gyrus|Heschl|planum/, 'brain_te'],
    [/white matter|white_matter|corpus.callosum|internal capsule|commissure|lamina terminalis|optic/, 'brain_wm']],
  lung: [[/bronch(?!opulmonary)|cartilage_of|hilum/, 'lung_br'], [/trachea/, 'lung_tr'],
    [/upper lobe of right|R_lung_upper/, 'lung_ru'], [/middle lobe|R_lung_middle/, 'lung_rm'], [/lower lobe of right|R_lung_lower/, 'lung_rl'],
    [/upper lobe of left|L_lung_upper/, 'lung_lu'], [/lower lobe of left|L_lung_lower/, 'lung_ll']],
  heart: [[/papillary/, 'heart_pap'], [/tricuspid/, 'heart_tri'], [/mitral/, 'heart_mit'], [/pulmonary.valve/, 'heart_pulv'], [/aortic.valve/, 'heart_aov'],
    [/interventricular_septum/, 'heart_sep'], [/left_cardiac_atrium/, 'heart_la'], [/left_ventricle/, 'heart_lv'], [/right_cardiac_atrium/, 'heart_ra'], [/right_ventricle/, 'heart_rv'],
    [/right coronary|of right coronary/, 'heart_rca'], [/left coronary|circumflex/, 'heart_lca'], [/vein|sinus/, 'heart_cv'], [/wall of heart/, 'heart_wall']],
  kidney: [[/ureter/, 'kid_ur'], [/kidney|renal/, 'kid_k']],
  bladder: [[/urethra/, 'bl_ur'], [/bladder/, 'bl_b']],
  stomach: [[/esophagus/, 'st_es'], [/stomach/, 'st_st']],
  bowel: [[/duoden|sphincter_of_hep/, 'bw_du'], [/jejunum|jejenum/, 'bw_je'], [/ileum/, 'bw_il']],
  colon: [[/appendix/, 'co_app'], [/rectum/, 'co_rec'], [/caecum|ileocecal/, 'co_cec'], [/ascending_colon|hepatic_flexure/, 'co_asc'], [/transverse_colon|splenic_flexure/, 'co_tr'],
    [/descending_colon/, 'co_de'], [/sigmoid/, 'co_sig'], [/taenia/, 'co_col']],
  prostate: [[/seminal/, 'pr_sv'], [/prostate/, 'pr_p']],
  nose: [[/tonsil/, 'nose_ton'], [/nasal/, 'nose_nc'], [/cartilage|larynx|epiglot/, 'nose_lar']],
  uterus: [[/cervi/, 'ut_cx'], [/./, 'ut_body']],
  ovary: [[/fallopian|tube/, 'ov_tube'], [/ovary/, 'ov_o']],
  vessel: [[/pulmonary.artery/, 'ves_pa'], [/pulmonary.vein/, 'ves_pv'], [/aorta/, 'ves_aorta'], [/vena.cava|brachiocephalic/, 'ves_cava'],
    [/iliac.*arter/, 'ves_iliac_a'], [/iliac.*vein|median_sacral_vein/, 'ves_iliac_v'],
    [/carotid|subclavian.arter|vertebral.arter|ophthalm|retinal.arter|ciliary.arter|opthalmic|axillary.arter|brachial.arter/, 'ves_neck_a'],
    [/jugular|subclavian.vein|retinal.vein|ophthalmic.vein|axillary.vein|brachial.vein/, 'ves_neck_v'],
    [/arter|trunk|celiac/, 'ves_visc_a'], [/vein/, 'ves_visc_v']],
  // 근육: 묶음 안의 개별 근육
  quad: [[/rectus femoris/, 'quad_rf'], [/vastus lateralis/, 'quad_vl'], [/vastus medialis/, 'quad_vm'], [/vastus intermedius/, 'quad_vi'], [/sartorius/, 'quad_sa']],
  ham: [[/biceps femoris/, 'ham_bf'], [/semitendinosus/, 'ham_st'], [/semimembranosus/, 'ham_sm']],
  glute: [[/gluteus maximus/, 'glu_max'], [/gluteus medius/, 'glu_med'], [/gluteus minimus/, 'glu_min'], [/tensor fasciae/, 'glu_tfl'], [/./, 'glu_deep']],
  calf: [[/gastrocnemius|plantaris/, 'calf_ga'], [/soleus/, 'calf_so'], [/calcaneal tendon/, 'calf_at'], [/./, 'calf_deep']],
  abs: [[/rectus abdominis|pyramidalis|linea alba/, 'abs_ra'], [/external oblique/, 'abs_eo'], [/internal oblique/, 'abs_io'], [/transversus/, 'abs_ta']],
  cuff: [[/supraspinatus/, 'cuff_ss'], [/infraspinatus/, 'cuff_is'], [/teres minor/, 'cuff_tm'], [/subscapularis/, 'cuff_sc']],
  pect: [[/pectoralis major/, 'pect_maj'], [/pectoralis minor/, 'pect_min'], [/serratus/, 'pect_sa'], [/subclavius/, 'pect_sub']],
  biceps: [[/biceps/, 'bic_bb'], [/coracobrachialis/, 'bic_cb'], [/brachialis/, 'bic_br']],
  lat: [[/latissimus/, 'lat_ld'], [/teres major/, 'lat_tm']],
  psoas: [[/psoas/, 'pso_pm'], [/iliacus/, 'pso_il']],
  diaph: [[/diaphragm/, 'dia_d'], [/./, 'dia_ic']],
  shin: [[/tibialis anterior/, 'shin_ta'], [/fibularis longus|fibularis brevis/, 'shin_fib'], [/./, 'shin_ext']],
  adduct: [[/adductor longus/, 'add_l'], [/adductor brevis/, 'add_b'], [/adductor magnus|adductor minimus/, 'add_m'], [/gracilis/, 'add_g'], [/pectineus/, 'add_p']]
};

// group: 크게 단계 묶음 id, names: 이 조각을 가리키는 이름들(자기 이름이 먼저, 그 위 노드 이름이 뒤에)
function fineId(group, names) {
  if (group === 'cerv' || group === 'thor' || group === 'lumb') return vert(group, names[0]);
  if (group === 'ribs') return rib(names[0]);
  const rules = R[group]; if (!rules) return group;
  for (const n of names) for (const [re, id] of rules) if (re.test(n)) return id;
  return group;
}
module.exports = { fineId };
