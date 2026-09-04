/**
 * Synthetic policy documents.
 *
 * These are fictional but modelled closely on the structure and vocabulary of
 * real Indian health insurance documents — an IRDAI-style retail indemnity
 * policy, an Ayushman Bharat PM-JAY entitlement letter, and an employer group
 * mediclaim certificate. Clause numbering is deliberate: the Policy
 * Understanding Agent cites these clause labels and line numbers back to the
 * user, so the documents have to read like the real thing.
 *
 * No real insurer, hospital, or person is depicted.
 */

export type SamplePolicy = {
  id: string;
  label: string;
  insurer: string;
  blurb: string;
  tag: string;
  accent: "plum" | "sage" | "ochre";
  text: string;
};

const MERIDIAN = `MERIDIAN HEALTH INSURANCE COMPANY LIMITED
SAMPOORNA SURAKSHA — FAMILY FLOATER HEALTH INSURANCE POLICY
Policy Schedule cum Certificate of Insurance
IRDAI Registration No. 148 | UIN: MRDHLIP24017V032425

POLICY NUMBER: MHI/BLR/2025/0084412
POLICY HOLDER: Ananya Ravindran
INSURED MEMBERS: Self (38F), Spouse (41M), Dependent Child (9M), Mother (66F)
PERIOD OF INSURANCE: From 00:00 hrs on 14 March 2025 to midnight of 13 March 2026
SUM INSURED: Rs. 5,00,000 (Rupees Five Lakh only) on a FAMILY FLOATER basis,
available in aggregate to all Insured Persons named above during one Policy Year.
CUMULATIVE BONUS ACCRUED: Rs. 50,000 (10% for one claim-free year)

SECTION 1 — SCOPE OF COVER

1.1 In-patient Hospitalisation. The Company shall indemnify the Medical Expenses
incurred by an Insured Person for Hospitalisation of more than 24 consecutive
hours arising out of Illness or Injury contracted during the Policy Period,
up to the Sum Insured.

1.2 Room, Boarding and Nursing Expenses are payable up to 1% (one percent) of
the Sum Insured per day, subject to the room category actually occupied being
a Single Private A/C Room or lower. For the Sum Insured stated in the Schedule
this limit is Rs. 5,000 per day.

1.3 Intensive Care Unit (ICU) / Intensive Cardiac Care Unit charges are payable
up to 2% (two percent) of the Sum Insured per day, being Rs. 10,000 per day for
the Sum Insured stated in the Schedule.

1.4 PROPORTIONATE DEDUCTION. Where the Insured Person is admitted to a room
category whose rent exceeds the eligible limit specified at Clause 1.2, the
Company shall be liable only for a proportionate share of ALL Associated
Medical Expenses in the ratio that the eligible room rent bears to the room
rent actually charged. Associated Medical Expenses shall include surgeon's fees,
anaesthetist's fees, operation theatre charges, nursing charges, consultant
visits and investigations billed during the period of stay. Proportionate
deduction shall NOT apply to the cost of pharmacy, implants, consumables or
diagnostics billed separately at a uniform hospital-wide rate.

1.5 Pre-hospitalisation Medical Expenses incurred up to 60 days immediately
before the date of admission are payable, provided the claim for in-patient
Hospitalisation has been admitted.

1.6 Post-hospitalisation Medical Expenses incurred up to 90 days immediately
after the date of discharge are payable on the same condition.

1.7 Day Care Treatments listed in Annexure II are covered without the 24-hour
Hospitalisation requirement.

1.8 Road Ambulance charges are payable up to Rs. 3,000 per Hospitalisation
event from the place of first occurrence to the Hospital.

SECTION 2 — SUB-LIMITS AND CO-PAYMENT

2.1 Cataract surgery is limited to Rs. 40,000 per eye and Rs. 80,000 per
Policy Year in aggregate.

2.2 Modern Treatment Methods (including robotic surgery, oral chemotherapy,
deep brain stimulation and bronchial thermoplasty) are limited in aggregate to
50% of the Sum Insured per Policy Year.

2.3 Cyber knife, stem cell therapy and immunotherapy are limited to 25% of the
Sum Insured per Policy Year.

2.4 Joint replacement (knee or hip) is limited to Rs. 2,00,000 per joint,
inclusive of the cost of the implant.

2.5 CO-PAYMENT. A co-payment of 10% (ten percent) of each and every admissible
claim shall be borne by the Insured Person where the claim relates to an
Insured Person who has completed 61 years of age on the date of admission.
No co-payment applies to Insured Persons below that age.

2.6 There is no aggregate deductible under this Policy.

SECTION 3 — WAITING PERIODS

3.1 Initial Waiting Period. Except for Injury sustained in an Accident, no
claim is payable for any Illness contracted within 30 days of the first
inception of this Policy.

3.2 Specified Illness Waiting Period of 24 months applies to: cataract,
benign prostatic hypertrophy, hernia of all types, hydrocele, fistula and
fissure in ano, piles, sinusitis, tonsillectomy, gall bladder stone disease,
varicose veins, and non-infective arthritis.

3.3 Pre-existing Diseases declared and accepted at the time of proposal are
covered after a continuous waiting period of 36 months from the first
inception of the Policy. The Insured Person has declared Type 2 Diabetes
Mellitus (diagnosed 2019); the applicable waiting period expires on
13 March 2028.

3.4 Maternity Expenses are covered after a waiting period of 36 months,
limited to Rs. 50,000 for normal delivery and Rs. 75,000 for caesarean
section, restricted to two deliveries in the lifetime of the Policy.

SECTION 4 — PERMANENT EXCLUSIONS

4.1 Any expenses relating to cosmetic or plastic surgery, unless required as
part of medically necessary treatment to remove a direct consequence of an
Injury, Cancer or Burns.

4.2 Dental treatment or surgery of any kind unless necessitated by Injury and
requiring Hospitalisation.

4.3 Expenses for spectacles, contact lenses and hearing aids, and the cost of
routine eye and ear examinations.

4.4 Treatment taken outside the geographical limits of India.

4.5 Any expenses arising from participation in hazardous or adventure sports,
in a professional capacity or otherwise.

4.6 Non-medical and consumable items listed in Annexure I to this Policy,
including but not limited to gloves, sanitisers, attendant charges, admission
kits, and telephone or television charges during the stay.

4.7 Treatment for obesity or weight control unless all four conditions in
Clause 4.7(a) to 4.7(d) are simultaneously satisfied.

SECTION 5 — CLAIMS PROCEDURE

5.1 CASHLESS FACILITY. Cashless treatment is available only at Network
Providers listed in Annexure III and on the Company's website. The Network
Provider shall submit the pre-authorisation request to the Third Party
Administrator, MedAssist Health Services Pvt. Ltd.

5.2 For a PLANNED Hospitalisation, the pre-authorisation request must reach
the TPA at least 48 hours before the proposed date of admission.

5.3 For an EMERGENCY Hospitalisation, intimation must be given to the TPA
within 24 hours of admission. Failure to intimate within this period does not
by itself invalidate the claim but may require the claim to be processed as a
reimbursement claim.

5.4 REIMBURSEMENT. Where treatment is taken at a Non-Network Hospital, the
Insured Person shall pay the Hospital directly and submit the claim for
reimbursement. Such claims are payable at 80% (eighty percent) of the
admissible amount, the balance 20% being borne by the Insured Person.

5.5 All documents in support of a reimbursement claim must be submitted within
30 days of the date of discharge.

5.6 The Company shall settle or reject a claim within 15 days of receipt of the
last necessary document.

SECTION 6 — ANNEXURE III (EXTRACT): NETWORK PROVIDERS, BENGALURU

6.1 Sanjeevani Multispeciality Hospital, Jayanagar — Cashless
6.2 Kaveri Institute of Medical Sciences, Whitefield — Cashless
6.3 Vasavi Heart and Vascular Centre, Rajajinagar — Cashless
6.4 Nandi Hills Super Speciality Hospital, Hebbal — Cashless
6.5 St. Aloysius Mission Hospital, Shivajinagar — Cashless
6.6 Prakruthi Mother and Child Hospital, Malleshwaram — Cashless
6.7 Chinmaya General Hospital, Indiranagar — Cashless
6.8 Tarangini Speciality Hospital, Banashankari — Cashless
6.9 Sirsi Circle Trauma and Emergency Centre, Chamarajpet — Cashless

Note: Network status is revised periodically. The Insured Person is advised to
verify empanelment with the TPA before admission.`;

const PMJAY = `AYUSHMAN BHARAT — PRADHAN MANTRI JAN AROGYA YOJANA (PM-JAY)
NATIONAL HEALTH AUTHORITY, GOVERNMENT OF INDIA
State Health Agency: Karnataka (Arogya Karnataka convergence)

FAMILY ENTITLEMENT RECORD
PM-JAY ID: PMJAY-KA-29-0774-13920
AYUSHMAN CARD HOLDER: Mahadeva Naik
FAMILY MEMBERS ENTITLED: 5 (as per SECC 2011 / State beneficiary database)
DISTRICT: Bengaluru Urban
ENTITLEMENT PERIOD: 01 April 2025 to 31 March 2026

CLAUSE 1 — BENEFIT COVER

1.1 The scheme provides a health cover of Rs. 5,00,000 (Rupees Five Lakh only)
per eligible family per year for secondary and tertiary care hospitalisation.

1.2 The cover operates on a FAMILY FLOATER basis. There is no cap on family
size, age or gender, and no restriction on the number of members who may use
the entitlement within the year.

1.3 The benefit is entirely CASHLESS at the point of care. No beneficiary is
required to pay any amount for treatment covered under an approved Health
Benefit Package at an Empanelled Health Care Provider.

1.4 There is no co-payment, no deductible and no waiting period under this
scheme. Pre-existing conditions are covered from the first day of entitlement.

CLAUSE 2 — ROOM AND WARD ENTITLEMENT

2.1 The scheme entitles the beneficiary to admission in the GENERAL WARD of an
Empanelled Health Care Provider. Package rates are inclusive of bed charges for
the general ward for the entire period of stay.

2.2 Where a beneficiary chooses, at their own instance, to be admitted to a
private room, semi-private room or any accommodation above general ward, the
differential room charges and any consequent difference in tariff shall be
borne entirely by the beneficiary and shall not be reimbursed by the scheme.

2.3 ICU care, where clinically indicated, is included within the applicable
Health Benefit Package rate at no additional charge to the beneficiary.

CLAUSE 3 — SCOPE OF PACKAGES

3.1 Treatment is reimbursed to the hospital at the rates specified in the
Health Benefit Package master (HBP 2.2), covering 1,949 procedures across 27
specialties.

3.2 The package rate is all-inclusive and covers: registration charges, bed
charges in general ward, nursing and boarding, surgeon and anaesthetist fees,
medical practitioner and consultant fees, anaesthesia, blood transfusion,
oxygen, OT charges, cost of surgical appliances, drugs and medicines, cost of
prosthetic devices and implants, X-ray and diagnostics, and food for the
patient.

3.3 Pre-hospitalisation expenses for up to 3 days prior to admission are
included in the package rate.

3.4 Post-hospitalisation expenses, including medicines and diagnostics, for up
to 15 days following discharge are included in the package rate.

3.5 Transport allowance of Rs. 1,000 per hospitalisation is payable to the
beneficiary at the time of discharge.

CLAUSE 4 — LIMITATIONS AND EXCLUSIONS

4.1 The scheme is available ONLY at Empanelled Health Care Providers. Treatment
at a non-empanelled hospital is NOT covered and is NOT reimbursable under any
circumstance, including emergencies.

4.2 Out-patient department (OPD) consultations and treatment not resulting in
hospitalisation are excluded.

4.3 Drug rehabilitation programmes, cosmetic procedures, fertility treatment
and individual diagnostics for evaluation are excluded.

4.4 Where a beneficiary is simultaneously covered under the Employees' State
Insurance (ESI) Scheme, the Central Government Health Scheme (CGHS), or an
employer-provided health insurance policy, the beneficiary may elect which
cover to use for a given episode of care. Benefits shall not be claimed twice
for the same episode.

CLAUSE 5 — ADMISSION AND AUTHORISATION PROCESS

5.1 The beneficiary must present the Ayushman Card together with any one
government photo identity document at the Pradhan Mantri Arogya Mitra (PMAM)
help desk located at the Empanelled Health Care Provider.

5.2 The PMAM shall verify the beneficiary in the Beneficiary Identification
System (BIS) and raise a pre-authorisation request in the Transaction
Management System (TMS).

5.3 Pre-authorisation for a planned admission is ordinarily decided within 6
hours of submission. Emergency admissions may be initiated under the Emergency
Telephonic Intimation route and regularised within 24 hours.

5.4 The hospital shall not collect any payment, deposit, advance or "package
top-up" from the beneficiary for a procedure covered under HBP 2.2. Any such
demand may be reported to the State Health Agency grievance cell at 14555.

5.5 The beneficiary shall be given a discharge summary and a copy of the claim
submitted, free of cost, at the time of discharge.

CLAUSE 6 — EMPANELLED HEALTH CARE PROVIDERS (BENGALURU URBAN, EXTRACT)

6.1 Bengaluru Government General Hospital, Chamarajpet — Public, Empanelled
6.2 Sirsi Circle Trauma and Emergency Centre, Chamarajpet — Public, Empanelled
6.3 St. Aloysius Mission Hospital, Shivajinagar — Trust, Empanelled
6.4 Tarangini Speciality Hospital, Banashankari — Private, Empanelled
6.5 Sanjeevani Multispeciality Hospital, Jayanagar — Private, Empanelled
6.6 Hosahalli Community Health Centre, Peenya — Public, Empanelled
6.7 Vani Vilas District Hospital Annexe, KR Market — Public, Empanelled`;

const RIDGEWAY = `RIDGEWAY GENERAL INSURANCE COMPANY LIMITED
GROUP MEDICLAIM POLICY — CERTIFICATE OF INSURANCE
Master Policy Holder: Nexora Technologies India Private Limited
Master Policy No: RGI/GMC/2025/NEXORA/0031

CERTIFICATE HOLDER: Employee ID NXT-4417
NAME: Farhan Qureshi
RELATIONSHIP COVERED: Self, Spouse, 2 Children, 2 Dependent Parents
PERIOD: 01 July 2025 to 30 June 2026
SUM INSURED: Rs. 4,00,000 per family per policy year, on a floater basis
CORPORATE BUFFER: Rs. 1,00,000, available on HR approval once the family Sum
Insured is exhausted, subject to Clause 8.3.

CLAUSE 1 — BENEFITS

1.1 Hospitalisation expenses for a minimum of 24 hours are payable up to the
Sum Insured for illness or accident occurring during the policy period.

1.2 ROOM RENT ENTITLEMENT. Room, boarding and nursing charges are payable up to
Rs. 6,000 per day. This is an absolute limit and is not linked to the Sum
Insured.

1.3 ICU / CCU / HDU charges are payable up to Rs. 12,000 per day.

1.4 PROPORTIONATE DEDUCTION WAIVED. Notwithstanding anything to the contrary,
where the Insured Person occupies a room whose rent exceeds the limit at Clause
1.2, only the excess room rent shall be borne by the Insured Person. No
proportionate deduction shall be applied to surgeon's fees, operation theatre
charges, nursing, consultant visits or any other associated medical expense.

1.5 Pre-hospitalisation expenses for 30 days and post-hospitalisation expenses
for 60 days are payable.

1.6 Day care procedures are covered as per the Company's day care list.

1.7 Ambulance charges up to Rs. 2,500 per event.

1.8 MATERNITY BENEFIT. Rs. 60,000 for normal delivery and Rs. 85,000 for
caesarean section, limited to two events. Newborn cover is available from day
one within the family Sum Insured.

CLAUSE 2 — CO-PAYMENT AND DEDUCTIBLE

2.1 A co-payment of 10% (ten percent) of every admissible claim shall be borne
by the Insured Person, irrespective of age, room category or hospital.

2.2 In addition, an annual aggregate deductible of Rs. 10,000 per family shall
apply. The deductible is applied once per policy year, against the first
admissible claim of that year.

2.3 The co-payment at Clause 2.1 is applied AFTER the deductible at Clause 2.2
has been deducted from the admissible amount.

CLAUSE 3 — WAITING PERIODS

3.1 All waiting periods, including the 30-day initial waiting period, the
specified-illness waiting period and the pre-existing disease waiting period,
are WAIVED for members enrolled under this group policy from the date of
joining.

3.2 The maternity benefit at Clause 1.8 carries a 9-month waiting period from
the date of enrolment.

CLAUSE 4 — SUB-LIMITS

4.1 Cataract surgery: Rs. 35,000 per eye.
4.2 Knee or hip replacement: Rs. 1,50,000 per joint including implant.
4.3 Treatment of mental illness requiring hospitalisation: Rs. 1,00,000 per
policy year.
4.4 Non-allopathic (AYUSH) in-patient treatment at a government-recognised
institution: Rs. 30,000 per policy year.

CLAUSE 5 — EXCLUSIONS

5.1 Cosmetic and aesthetic treatment, unless reconstructive following injury.
5.2 Dental treatment other than that arising from accidental injury.
5.3 Infertility and assisted reproduction, including IVF.
5.4 Expenses on non-medical consumables as per the IRDAI standard exclusion
list, including but not limited to gloves, PPE kits, nebuliser masks, and
attendant comfort charges.
5.5 Self-inflicted injury and treatment for substance abuse.
5.6 Any treatment taken outside India.

CLAUSE 6 — CASHLESS AND PRE-AUTHORISATION

6.1 Cashless facility is administered by the Company's in-house claims team and
is available at all hospitals in the Ridgeway Network, listed at Clause 9.

6.2 For planned admissions, the pre-authorisation form must be submitted at
least 72 hours before admission. Approval is generally communicated within 4
working hours of a complete submission.

6.3 For emergency admissions, the hospital must intimate the Company within 24
hours of admission. An interim approval covering the first 24 hours is issued
on receipt of intimation, and is enhanced on submission of the treating
doctor's plan.

6.4 A pre-authorisation approval is an approval of an estimated amount only. It
is not a guarantee of final settlement, and the final admissible amount is
determined at the time of discharge on the basis of the final bill and the
terms of this policy.

CLAUSE 7 — REIMBURSEMENT AT NON-NETWORK HOSPITALS

7.1 Treatment at a hospital outside the Ridgeway Network is payable on a
reimbursement basis at 100% of the admissible amount, subject to the room rent
limits at Clause 1.2 and 1.3 and the co-payment at Clause 2.1.

7.2 Claim documents must be submitted to the HR-appointed claims desk within 45
days of discharge.

CLAUSE 8 — COORDINATION WITH OTHER COVER

8.1 Where the Insured Person is also covered under the Employees' State
Insurance Act, 1948, treatment at an ESI dispensary or ESI hospital shall be
availed under that scheme, and this policy shall not be liable for the same
episode.

8.2 Where a retail health insurance policy is also held, the Insured Person may
claim under either policy first. The second insurer shall settle the balance on
production of the settlement letter and attested bill copies.

8.3 The Corporate Buffer is discretionary, is allotted by Nexora Technologies
HR on a case-by-case basis, and may not be relied upon as an entitlement.

CLAUSE 9 — RIDGEWAY NETWORK HOSPITALS, BENGALURU (EXTRACT)

9.1 Kaveri Institute of Medical Sciences, Whitefield — Cashless
9.2 Nandi Hills Super Speciality Hospital, Hebbal — Cashless
9.3 Chinmaya General Hospital, Indiranagar — Cashless
9.4 Vasavi Heart and Vascular Centre, Rajajinagar — Cashless
9.5 Meenakshi Orthopaedic and Spine Institute, Koramangala — Cashless
9.6 Ashwini Neuro Centre, Sadashivanagar — Cashless
9.7 Sanjeevani Multispeciality Hospital, Jayanagar — Cashless
9.8 Prakruthi Mother and Child Hospital, Malleshwaram — Cashless`;

export const SAMPLE_POLICIES: SamplePolicy[] = [
  {
    id: "meridian",
    label: "Sampoorna Suraksha Family Floater",
    insurer: "Meridian Health Insurance",
    blurb:
      "Retail indemnity policy, ₹5L floater. Room rent capped at 1% of sum insured with proportionate deduction — the clause that most often causes a surprise bill.",
    tag: "Private retail",
    accent: "plum",
    text: MERIDIAN,
  },
  {
    id: "pmjay",
    label: "Ayushman Bharat PM-JAY entitlement",
    insurer: "National Health Authority",
    blurb:
      "₹5L per family per year, fully cashless — but only at empanelled hospitals, and only in the general ward. Nothing is reimbursed outside the network.",
    tag: "Government scheme",
    accent: "sage",
    text: PMJAY,
  },
  {
    id: "ridgeway",
    label: "Nexora Technologies Group Mediclaim",
    insurer: "Ridgeway General Insurance",
    blurb:
      "Employer group cover, ₹4L floater with a ₹6,000/day room cap. Proportionate deduction is waived, but a 10% co-pay and a ₹10,000 deductible apply.",
    tag: "Employer group",
    accent: "ochre",
    text: RIDGEWAY,
  },
];

export function getSamplePolicy(id: string): SamplePolicy | undefined {
  return SAMPLE_POLICIES.find((p) => p.id === id);
}
