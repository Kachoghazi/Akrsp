const express = require('express');
const { parse } = require('json2csv'); // Corrected import for json2csv
// const ExcelJS = require('exceljs');
const PdfMake = require('pdfmake');
const Student = require('../models/Student.js');  
const Teacher =require("../models/Teacher.js");// Adjust path as necessary
const { lang } = require('moment');

const router = express.Router();

// Set up pdfMake with built-in fonts (Roboto)
const printer = new PdfMake({
    Roboto: {
        normal: 'node_modules/pdfmake/build/vfs_fonts.js',
        bold: 'node_modules/pdfmake/build/vfs_fonts.js',
        italics: 'node_modules/pdfmake/build/vfs_fonts.js',
        bolditalics: 'node_modules/pdfmake/build/vfs_fonts.js'
    }
});


// Export to CSV
router.post('/students/export/csv', async (req, res) => {
    try {
        const students = await Student.find().populate('user');  // Fetch all students
        if (!students || students.length === 0) {
            return res.status(400).send('No students found for export');
        }

        const studentsData = students.map(student => ({
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.user.email,
            mobileNo: student.mobileNo,
            language:student. languagePreference
        }));

        const csv = parse(studentsData);  // Correct usage of json2csv
        res.header('Content-Type', 'text/csv');
        res.attachment('students.csv');
        res.send(csv);
    } catch (error) {
        console.error('Error exporting CSV:', error);
        res.status(500).send('Failed to export CSV');
    }
});
router.post('/teachers/export/csv', async (req, res) => {
    try {
        const teacher = await Teacher.find().populate('user');  // Fetch all students
        if (!teacher || teacher.length === 0) {
            return res.status(400).send('No students found for export');
        }

        const teachersData = teacher.map(teacher => ({
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            email: teacher.user.email,
            mobileNo: teacher.mobileNo
        }));

        const csv = parse(teachersData);  // Correct usage of json2csv
        res.header('Content-Type', 'text/csv');
        res.attachment('students.csv');
        res.send(csv);
    } catch (error) {
        console.error('Error exporting CSV:', error);
        res.status(500).send('Failed to export CSV');
    }
});

// Export to Excel
router.post('/students/export/excel', async (req, res) => {
    try {
        const students = await Student.find().populate('user');  // Fetch all students
        if (!students || students.length === 0) {
            return res.status(400).send('No students found for export');
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Students');

        worksheet.columns = [
            { header: 'First Name', key: 'firstName' },
            { header: 'Last Name', key: 'lastName' },
            { header: 'Email', key: 'email' },
            { header: 'Mobile No.', key: 'mobileNo' },
            {header:' language',key:'languagePreference'}
        ];

        students.forEach(student => {
            worksheet.addRow({
                firstName: student.firstName,
                lastName: student.lastName,
                email: student.user.email,
                mobileNo: student.mobileNo,
                languagePreference:student.languagePreference
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting Excel:', error);
        res.status(500).send('Failed to export Excel');
    }
});

// Export to PDF
router.post('/students/export/pdf', async (req, res) => {
    try {
        const students = await Student.find().populate('user');  // Fetch all students
        if (!students || students.length === 0) {
            return res.status(400).send('No students found for export');
        }

        // PDF content definition
        const docDefinition = {
            content: [
                { text: 'Student List', style: 'header' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', '*', '*', '*'],
                        body: [
                            ['First Name', 'Last Name', 'Email', 'Mobile No.'],
                            ...students.map(student => [
                                student.firstName,
                                student.lastName,
                                student.user.email,
                                student.mobileNo
                            ])
                        ]
                    }
                }
            ],
            styles: {
                header: {
                    fontSize: 18,
                    bold: true,
                    margin: [0, 0, 0, 10]
                }
            }
        };

        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=students.pdf');

        // Pipe PDF document to response
        pdfDoc.pipe(res);
        pdfDoc.end();
    } catch (error) {
        console.error('Error exporting PDF:', error);
        res.status(500).send('Failed to export PDF');
    }
});

module.exports = router;
