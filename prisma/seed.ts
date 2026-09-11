import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function upsertUser(data: {
  name: string;
  phone: string;
  password: string;
  role: "SUPER_ADMIN" | "DOCTOR" | "STAFF";
}) {
  const hashed = await bcrypt.hash(data.password, 10);
  return prisma.user.upsert({
    where: { phone: data.phone },
    update: {},
    create: { ...data, password: hashed },
  });
}

async function findOrCreateBranch(data: {
  name: string;
  address: string;
  city: string;
  phones: string[];
  workingHours: object;
  email?: string;
}) {
  const existing = await prisma.branch.findFirst({ where: { name: data.name } });
  if (existing) return existing;
  return prisma.branch.create({ data });
}

async function main() {
  // ── ١. Super Admin ──
  const admin = await upsertUser({
    name: "أدمن النظام",
    phone: "01000000000",
    password: "admin123",
    role: "SUPER_ADMIN",
  });

  // ── ٢. الفروع ──
  const maadi = await findOrCreateBranch({
    name: "فرع المعادي",
    address: "شارع ٩، المعادي",
    city: "القاهرة",
    phones: ["0223580011"],
    workingHours: {
      sat: "09:00-21:00",
      sun: "09:00-21:00",
      mon: "09:00-21:00",
      tue: "09:00-21:00",
      wed: "09:00-21:00",
      thu: "09:00-21:00",
      fri: "closed",
    },
    email: "maadi@dentaflow.example",
  });

  const nasrCity = await findOrCreateBranch({
    name: "فرع مدينة نصر",
    address: "شارع عباس العقاد، مدينة نصر",
    city: "القاهرة",
    phones: ["0222710022"],
    workingHours: {
      sat: "10:00-22:00",
      sun: "10:00-22:00",
      mon: "10:00-22:00",
      tue: "10:00-22:00",
      wed: "10:00-22:00",
      thu: "10:00-22:00",
      fri: "closed",
    },
    email: "nasrcity@dentaflow.example",
  });

  // ── ٣. الأطباء ──
  const drKhaled = await upsertUser({
    name: "د. خالد رضا",
    phone: "01011111111",
    password: "doctor123",
    role: "DOCTOR",
  });
  await prisma.doctorProfile.upsert({
    where: { userId: drKhaled.id },
    update: {},
    create: {
      userId: drKhaled.id,
      specialty: "تقويم الأسنان",
      licenseNumber: "DEN-1023",
      qualification: "بكالوريوس طب وجراحة الفم والأسنان",
      yearsOfExperience: 9,
      nationalId: "28801010112233",
      whatsapp: "01011111111",
    },
  });
  for (const branch of [maadi, nasrCity]) {
    await prisma.userBranch.upsert({
      where: { userId_branchId: { userId: drKhaled.id, branchId: branch.id } },
      update: {},
      create: { userId: drKhaled.id, branchId: branch.id },
    });
  }

  const drMona = await upsertUser({
    name: "د. منى علي",
    phone: "01022222222",
    password: "doctor123",
    role: "DOCTOR",
  });
  await prisma.doctorProfile.upsert({
    where: { userId: drMona.id },
    update: {},
    create: {
      userId: drMona.id,
      specialty: "علاج الجذور",
      licenseNumber: "DEN-1044",
      qualification: "ماجستير علاج الجذور",
      yearsOfExperience: 6,
      nationalId: "29003030445566",
      whatsapp: "01022222222",
    },
  });
  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: drMona.id, branchId: maadi.id } },
    update: {},
    create: { userId: drMona.id, branchId: maadi.id },
  });

  // ── ٤. الموظفون ──
  const mohamed = await upsertUser({
    name: "محمد أحمد",
    phone: "01033333333",
    password: "staff123",
    role: "STAFF",
  });
  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: mohamed.id, branchId: maadi.id } },
    update: {},
    create: { userId: mohamed.id, branchId: maadi.id },
  });

  const sara = await upsertUser({
    name: "سارة محمود",
    phone: "01044444444",
    password: "staff123",
    role: "STAFF",
  });
  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: sara.id, branchId: nasrCity.id } },
    update: {},
    create: { userId: sara.id, branchId: nasrCity.id },
  });

  // ── ٥. المرضى ──
  const patientsData = [
    {
      fullName: "أحمد سيد إبراهيم",
      birthDate: new Date("1990-03-14"),
      gender: "ذكر",
      phone: "01055501001",
      nationalId: "29003140112345",
      address: "٥ شارع النصر، المعادي",
      city: "القاهرة",
      job: "مهندس",
      maritalStatus: "متزوج",
      emergencyName: "سيد إبراهيم",
      emergencyPhone: "01055509001",
      referralSource: "فيسبوك",
      registrationBranchId: maadi.id,
      medicalHistory: {
        allergies: ["البنسلين"],
        chronicDiseases: [],
        currentMedications: null,
      },
    },
    {
      fullName: "منى عبد الرحمن",
      birthDate: new Date("1985-07-22"),
      gender: "أنثى",
      phone: "01055501002",
      nationalId: "28507220112346",
      address: "١٢ شارع الحرية، مدينة نصر",
      city: "القاهرة",
      job: "معلمة",
      maritalStatus: "متزوجة",
      emergencyName: "عبد الرحمن حسن",
      emergencyPhone: "01055509002",
      referralSource: "صديق",
      registrationBranchId: nasrCity.id,
      medicalHistory: {
        allergies: [],
        chronicDiseases: ["سكري"],
        isPregnant: false,
        currentMedications: "ميتفورمين",
      },
    },
    {
      fullName: "يوسف كريم عبد الله",
      birthDate: new Date("2001-11-02"),
      gender: "ذكر",
      phone: "01055501003",
      nationalId: "30111020112347",
      address: "٧ شارع التسعين، مدينة نصر",
      city: "القاهرة",
      job: "طالب",
      maritalStatus: "أعزب",
      emergencyName: "كريم عبد الله",
      emergencyPhone: "01055509003",
      referralSource: "جوجل",
      registrationBranchId: nasrCity.id,
      medicalHistory: { allergies: [], chronicDiseases: [], currentMedications: null },
    },
    {
      fullName: "هدى محمد الشناوي",
      birthDate: new Date("1978-01-30"),
      gender: "أنثى",
      phone: "01055501004",
      nationalId: "27801300112348",
      address: "٣ شارع الجيزة، المعادي",
      city: "القاهرة",
      job: "ربة منزل",
      maritalStatus: "متزوجة",
      emergencyName: "محمد الشناوي",
      emergencyPhone: "01055509004",
      referralSource: "زيارة سابقة",
      registrationBranchId: maadi.id,
      medicalHistory: {
        allergies: [],
        chronicDiseases: ["ضغط دم مرتفع"],
        isPregnant: false,
        currentMedications: "أملوديبين",
      },
    },
    {
      fullName: "كريم عادل فتحي",
      birthDate: new Date("1995-09-09"),
      gender: "ذكر",
      phone: "01055501005",
      nationalId: "29509090112349",
      address: "١٥ شارع مكرم عبيد، مدينة نصر",
      city: "القاهرة",
      job: "محاسب",
      maritalStatus: "أعزب",
      emergencyName: "عادل فتحي",
      emergencyPhone: "01055509005",
      referralSource: "إنستجرام",
      registrationBranchId: nasrCity.id,
      medicalHistory: { allergies: ["اللاتكس"], chronicDiseases: [], currentMedications: null },
    },
  ];

  const patients = [];
  for (const p of patientsData) {
    const { medicalHistory, ...patientFields } = p;
    let patient = await prisma.patient.findFirst({ where: { nationalId: patientFields.nationalId } });
    if (!patient) {
      patient = await prisma.patient.create({ data: patientFields });
    }
    await prisma.medicalHistory.upsert({
      where: { patientId: patient.id },
      update: {},
      create: { patientId: patient.id, ...medicalHistory },
    });
    patients.push(patient);
  }

  // ── ٦. بيانات تجريبية إضافية (مواعيد + زيارة + فاتورة) لاختبار الداشبورد ──
  const [p1, p2, p3] = patients;
  const today = new Date();
  today.setHours(10, 0, 0, 0);

  const existingAppt = await prisma.appointment.findFirst({ where: { patientId: p1.id } });
  if (!existingAppt) {
    await prisma.appointment.create({
      data: {
        patientId: p1.id,
        doctorId: drKhaled.id,
        branchId: maadi.id,
        dateTime: today,
        durationMinutes: 30,
        type: "CHECKUP",
        status: "CONFIRMED",
        createdBy: admin.id,
      },
    });

    const followUp = new Date(today);
    followUp.setDate(followUp.getDate() + 1);
    followUp.setHours(12, 30, 0, 0);
    await prisma.appointment.create({
      data: {
        patientId: p2.id,
        doctorId: drMona.id,
        branchId: maadi.id,
        dateTime: followUp,
        durationMinutes: 45,
        type: "FOLLOWUP",
        status: "CONFIRMED",
        createdBy: sara.id,
      },
    });

    const pastVisitDate = new Date(today);
    pastVisitDate.setDate(pastVisitDate.getDate() - 14);
    const visit = await prisma.visit.create({
      data: {
        patientId: p3.id,
        doctorId: drKhaled.id,
        branchId: nasrCity.id,
        dateTime: pastVisitDate,
        diagnosis: "تسوس في الضرس السفلي الأيمن",
        procedure: "حشو الضرس",
        affectedTeeth: [46],
        sessionCost: 800,
        doctorNotes: "استجابة جيدة للعلاج",
      },
    });

    await prisma.invoice.create({
      data: {
        patientId: p3.id,
        branchId: nasrCity.id,
        visitId: visit.id,
        items: [{ name: "حشو ضرس", price: 800, quantity: 1 }],
        subtotal: 800,
        discount: 0,
        total: 800,
        status: "PAID",
        isLocked: true,
        sequenceNumber: "2026-0001",
        payments: {
          create: {
            method: "CASH",
            amount: 800,
            recordedBy: sara.id,
          },
        },
      },
    });

    await prisma.toothRecord.createMany({
      data: [
        { patientId: p3.id, toothNumber: 46, condition: "FILLED", updatedBy: drKhaled.id },
        { patientId: p1.id, toothNumber: 18, condition: "NEEDS_TREATMENT", updatedBy: drKhaled.id },
      ],
      skipDuplicates: true,
    });
  }

  console.log("Seed completed:");
  console.log(`- Users: admin, ${drKhaled.name}, ${drMona.name}, ${mohamed.name}, ${sara.name}`);
  console.log(`- Branches: ${maadi.name}, ${nasrCity.name}`);
  console.log(`- Patients: ${patients.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
