new Vue({
    el: '#app',
    data: {
        is_booking: false,
        current_stage: null,
        firstname: '',
        lastname: '',
        email: '',
        phone: '',
        package: '',
        response_data: '',
        date: '',
        alert: null,
        payment_method: null,
        stages: {
            form: 1,
            pick_seat: 2,
            pay: 3,
            complete: 4,
            failed: 5
        },
        currentview: null,
        formview: {
            package: 1,
            info: 2,
            payment: 3
        }
    },

    created: function () {
        this.current_stage = this.stages.form
        this.currentview = this.formview.package
    },

    mounted: function () {
        let form = this.$refs.form
        let min_date = form.dataset['minDate']
        this.date = min_date
    },

    methods: {
        setAlert(type, message) {
            if(!type) {
                return this.alert = null
            }

            this.alert = {type, message}
        },

        gotoInfo() {
            let {package, date} = this

            if(!package) {
                return this.setAlert('error', 'Please select package')
            }

            if(!date) {
                return this.setAlert('error', 'Please select date')
            }

            this.setAlert(null)
            this.currentview = this.formview.info
        },


        gotoPayment() {
            let {firstname, lastname, email, phone} = this

            if(!firstname) {
                return this.setAlert('error', 'Please enter your firstname')
            }

            if(!lastname) {
                return this.setAlert('error', 'Please enter your lastname')
            }

            if(!email) {
                return this.setAlert('error', 'Please enter your valid email')
            }

            if(!phone) {
                return this.setAlert('error', 'Please enter your valid phone number')
            }

            this.setAlert(null)
            this.currentview = this.formview.payment
        },

        book: function () {

            let {
                firstname,
                lastname,
                email,
                phone,
                package,
                date,
                payment_method
            } = this

            if(!payment_method) {
                return this.setAlert('error', 'Please choose a payment method to continue')
            }

            this.is_booking = true

            let params = {
                firstname,
                lastname,
                email,
                phone,
                package,
                date,
                payment_method
            }

            this.$http.post('/book', params)
                .then(res => {
                    let data = res.data
                    this.is_booking = false
                    console.log(data)

                    if (data.success) {

                        if(data.has_paid) {
                            this.current_stage = this.stages.complete
                            this.response_data = data
                            return
                        }

                        if(!data.has_paid && data.payment) {
                            let {amount, email, phone, reference} = data
                            return this.loadPayment(reference, amount, email, phone)
                        }

                        if(!data.has_paid) {
                            this.current_stage = this.stages.complete
                            this.response_data = data
                            return
                        }
                    }

                    if (data.success === false) {
                        this.current_stage = this.stages.failed
                        this.response_data = data
                        return
                    }
                })
                .catch(err => {
                    this.is_booking = false
                })
        },

        loadPayment(reference, amount, email, phone) {
            let self = this
            let x = getpaidSetup({
                PBFPubKey: this.$refs.form.dataset['key'],
                customer_email: email,
                amount,
                customer_phone: phone,
                currency: "NGN",
                txref: reference,
                onclose: function () { },
                callback: function () {
                    self.verifyPayment(reference)
                    x.close();
                }
            });
        },

        verifyPayment: function (reference) {
            this.is_booking = true
            this.$http.post('/book/verify', {reference})
                .then(res => {
                    this.is_booking = false
                    let data = res.data

                    if(data.success) {
                        this.current_stage = this.stages.complete
                        return this.data = data
                    }

                    if(data.success === false) {
                        this.current_stage = this.stages.failed
                        return this.data = data
                    }
                })
                .catch(err => {
                    console.log(err)
                    this.is_booking = false
                })
        },

        refresh: function () {
            this.current_stage = this.stages.form
        }
    }
})