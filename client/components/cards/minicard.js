import { ReactiveCache } from '/imports/reactiveCache';
import { TAPi18n } from '/imports/i18n';
import { CustomFieldStringTemplate } from '/client/lib/customFields'

// Template.cards.events({
//   'click .member': Popup.open('cardMember')
// });

BlazeComponent.extendComponent({
  template() {
    return 'minicard';
  },

  formattedCurrencyCustomFieldValue(definition) {
    const customField = this.data()
      .customFieldsWD()
      .find(f => f._id === definition._id);
    const customFieldTrueValue =
      customField && customField.trueValue ? customField.trueValue : '';

    const locale = TAPi18n.getLanguage();
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: definition.settings.currencyCode,
    }).format(customFieldTrueValue);
  },

  formattedStringtemplateCustomFieldValue(definition) {
    const customField = this.data()
      .customFieldsWD()
      .find(f => f._id === definition._id);

    const customFieldTrueValue =
      customField && customField.trueValue ? customField.trueValue : [];

    const ret = new CustomFieldStringTemplate(definition).getFormattedValue(customFieldTrueValue);
    return ret;
  },

  showCreatorOnMinicard() {
    // cache "board" to reduce the mini-mongodb access
    const board = this.data().board();
    let ret = false;
    if (board) {
      ret = board.allowsCreatorOnMinicard ?? false;
    }
    return ret;
  },
  isWatching() {
    const card = this.currentData();
    return card.findWatcher(Meteor.userId());
  },

  showMembers() {
    // cache "board" to reduce the mini-mongodb access
    const board = this.data().board();
    let ret = false;
    if (board) {
      ret =
        board.allowsMembers === null ||
        board.allowsMembers === undefined ||
        board.allowsMembers
      ;
    }
    return ret;
  },

  showAssignee() {
    // cache "board" to reduce the mini-mongodb access
    const board = this.data().board();
    let ret = false;
    if (board) {
      ret =
        board.allowsAssignee === null ||
        board.allowsAssignee === undefined ||
        board.allowsAssignee
      ;
    }
    return ret;
  },

  /** opens the card label popup only if clicked onto a label
   * <li> this is necessary to have the data context of the minicard.
   *      if .js-card-label is used at click event, then only the data context of the label itself is available at this.currentData()
   */
  cardLabelsPopup(event) {
    if (this.find('.js-card-label:hover')) {
      Popup.open("cardLabels")(event, {dataContextIfCurrentDataIsUndefined: this.currentData()});
    }
  },

  events() {
    return [
      {
        'click .js-linked-link'() {
          if (this.data().isLinkedCard()) Utils.goCardId(this.data().linkedId);
          else if (this.data().isLinkedBoard())
            Utils.goBoardId(this.data().linkedId);
        },
        'click .js-toggle-minicard-label-text'() {
          if (window.localStorage.getItem('hiddenMinicardLabelText')) {
            window.localStorage.removeItem('hiddenMinicardLabelText'); //true
          } else {
            window.localStorage.setItem('hiddenMinicardLabelText', 'true'); //true
          }
        },
        'click span.badge-icon.fa.fa-sort, click span.badge-text.check-list-sort' : Popup.open("editCardSortOrder"),
        'click .minicard-labels' : this.cardLabelsPopup,
        'click .js-open-minicard-details-menu': Popup.open('minicardDetailsActions'),
      }
    ];
  },
}).register('minicard');

Template.minicard.helpers({
  hiddenMinicardLabelText() {
    const currentUser = ReactiveCache.getCurrentUser();
    if (currentUser) {
      return (currentUser.profile || {}).hiddenMinicardLabelText;
    } else if (window.localStorage.getItem('hiddenMinicardLabelText')) {
      return true;
    } else {
      return false;
    }
  },
  // XXX resolve this nasty hack for https://github.com/veliovgroup/Meteor-Files/issues/763
  sess() {
    return Meteor.connection && Meteor.connection._lastSessionId
      ? Meteor.connection._lastSessionId
      : null;
  },
  isWatching() {
    return this.findWatcher(Meteor.userId());
  }
});

BlazeComponent.extendComponent({
  events() {
    return [
      {
        'keydown input.js-edit-card-sort-popup'(evt) {
          // enter = save
          if (evt.keyCode === 13) {
            this.find('button[type=submit]').click();
          }
        },
        'click button.js-submit-edit-card-sort-popup'(event) {
          // save button pressed
          event.preventDefault();
          const sort = this.$('.js-edit-card-sort-popup')[0]
            .value
            .trim();
          if (!Number.isNaN(sort)) {
            let card = this.data();
            card.move(card.boardId, card.swimlaneId, card.listId, sort);
            Popup.back();
          }
        },
      }
    ]
  }
}).register('editCardSortOrderPopup');

Template.minicardDetailsActionsPopup.events({
  'click .js-due-date': Popup.open('editCardDueDate'),
  'click .js-move-card': Popup.open('moveCard'),
  'click .js-copy-card': Popup.open('copyCard'),
  'click .js-set-card-color': Popup.open('setCardColor'),
  'click .js-add-labels': Popup.open('cardLabels'),
  'click .js-link': Popup.open('linkCard'),
  'click .js-move-card-to-top'(event) {
    event.preventDefault();
    const minOrder = this.getMinSort();
    this.move(this.boardId, this.swimlaneId, this.listId, minOrder - 1);
    Popup.back();
  },
  'click .js-move-card-to-bottom'(event) {
    event.preventDefault();
    const maxOrder = this.getMaxSort();
    this.move(this.boardId, this.swimlaneId, this.listId, maxOrder + 1);
    Popup.back();
  },
  'click .js-archive': Popup.afterConfirm('cardArchive', function () {
    Popup.close();
    this.archive();
    Utils.goBoardId(this.boardId);
  }),
  'click .js-toggle-watch-card'() {
    const currentCard = this;
    const level = currentCard.findWatcher(Meteor.userId()) ? null : 'watching';
    Meteor.call('watch', 'card', currentCard._id, level, (err, ret) => {
      if (!err && ret) Popup.back();
    });
  },
});
