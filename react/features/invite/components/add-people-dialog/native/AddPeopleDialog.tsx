/* eslint-disable lines-around-comment */

import _ from 'lodash';
import React, { ReactElement } from 'react';
import {
    ActivityIndicator,
    FlatList,
    TouchableOpacity,
    View,
    ViewStyle
} from 'react-native';
import { connect } from 'react-redux';

import { IReduxState } from '../../../../app/types';
import { openDialog } from '../../../../base/dialog/actions';
import AlertDialog from '../../../../base/dialog/components/native/AlertDialog';
import { translate } from '../../../../base/i18n/functions';
import Icon from '../../../../base/icons/components/Icon';
import {
    IconCheck,
    IconCloseCircle,
    IconPhoneRinging,
    IconSearch,
    IconShare
} from '../../../../base/icons/svg';
// @ts-ignore
import JitsiScreen from '../../../../base/modal/components/JitsiScreen';
import AvatarListItem from '../../../../base/react/components/native/AvatarListItem';
import { Item } from '../../../../base/react/types';
import BaseTheme from '../../../../base/ui/components/BaseTheme.native';
import Input from '../../../../base/ui/components/native/Input';
import HeaderNavigationButton
    from '../../../../mobile/navigation/components/HeaderNavigationButton';
import { beginShareRoom } from '../../../../share-room/actions';
import { INVITE_TYPES } from '../../../constants';
import AbstractAddPeopleDialog, {
    // @ts-ignore
    type Props as AbstractProps,
    // @ts-ignore
    type State as AbstractState,
    _mapStateToProps as _abstractMapStateToProps
} from '../AbstractAddPeopleDialog';

// @ts-ignore
import styles, { AVATAR_SIZE } from './styles';


interface IProps extends AbstractProps {

    /**
     * True if the invite dialog should be open, false otherwise.
     */
    _isVisible: boolean;

    /**
     * Default prop for navigation between screen components(React Navigation).
     */
    navigation: Object;

    /**
     * Function used to translate i18n labels.
     */
    t: Function;

    /**
     * Theme used for styles.
     */
    theme: Object;
}

interface IState extends AbstractState {

    /**
     * Boolean to show if an extra padding needs to be added to the bottom bar.
     */
    bottomPadding: boolean;

    /**
     * State variable to keep track of the search field value.
     */
    fieldValue: string;

    /**
     * True if a search is in progress, false otherwise.
     */
    searchInprogress: boolean;

    /**
     * An array of items that are selectable on this dialog. This is usually
     * populated by an async search.
     */
    selectableItems: Array<Object>;
}

/**
 * Implements a special dialog to invite people from a directory service.
 */
class AddPeopleDialog
    // @ts-ignore
    extends AbstractAddPeopleDialog<IProps, IState> {
    /**
     * Default state object to reset the state to when needed.
     */
    defaultState = {
        addToCallError: false,
        addToCallInProgress: false,
        bottomPadding: false,
        fieldValue: '',
        inviteItems: [],
        searchInprogress: false,
        selectableItems: []
    };

    /**
     * TimeoutID to delay the search for the time the user is probably typing.
     */

    /* eslint-disable-next-line no-undef */
    searchTimeout: number;

    /**
     * Contrustor of the component.
     *
     * @inheritdoc
     */
    constructor(props: IProps) {
        super(props);

        this.state = this.defaultState;

        this._keyExtractor = this._keyExtractor.bind(this);
        this._renderInvitedItem = this._renderInvitedItem.bind(this);
        this._renderItem = this._renderItem.bind(this);
        this._renderSeparator = this._renderSeparator.bind(this);
        this._onClearField = this._onClearField.bind(this);
        this._onInvite = this._onInvite.bind(this);
        this._onPressItem = this._onPressItem.bind(this);
        this._onShareMeeting = this._onShareMeeting.bind(this);
        this._onTypeQuery = this._onTypeQuery.bind(this);
        this._renderShareMeetingButton = this._renderShareMeetingButton.bind(this);
        this._renderIcon = this._renderIcon.bind(this);
    }

    /**
     * Implements React's {@link Component#componentDidMount()}. Invoked
     * immediately after this component is mounted.
     *
     * @inheritdoc
     * @returns {void}
     */
    componentDidMount() {
        const { navigation, t } = this.props;

        // @ts-ignore
        navigation.setOptions({
            headerRight: () => (
                <HeaderNavigationButton
                    disabled = { this._isAddDisabled() }
                    label = { t('inviteDialog.send') }
                    style = { styles.sendBtn }
                    twoActions = { true } />
            )
        });
    }

    /**
     * Implements {@code Component#componentDidUpdate}.
     *
     * @inheritdoc
     */
    componentDidUpdate(prevProps: IProps) {
        const { navigation, t } = this.props;

        // @ts-ignore
        navigation.setOptions({
            // eslint-disable-next-line react/no-multi-comp
            headerRight: () => (
                <HeaderNavigationButton
                    disabled = { this._isAddDisabled() }
                    label = { t('inviteDialog.send') }
                    onPress = { this._onInvite }
                    style = { styles.sendBtn }
                    twoActions = { true } />
            )
        });

        if (prevProps._isVisible !== this.props._isVisible) {
            // Clear state
            this._clearState();
        }
    }

    /**
     * Implements {@code Component#render}.
     *
     * @inheritdoc
     */
    render() {
        const {
            // @ts-ignore
            _addPeopleEnabled,
            // @ts-ignore
            _dialOutEnabled
        } = this.props;
        // @ts-ignore
        const { inviteItems, selectableItems } = this.state;

        let placeholderKey = 'searchPlaceholder';

        if (!_addPeopleEnabled) {
            placeholderKey = 'searchCallOnlyPlaceholder';
        } else if (!_dialOutEnabled) {
            placeholderKey = 'searchPeopleOnlyPlaceholder';
        }

        return (
            <JitsiScreen
                footerComponent = { this._renderShareMeetingButton }
                style = { styles.addPeopleContainer }>
                <Input
                    autoFocus = { false }
                    clearable = { true }
                    customStyles = {{ container: styles.customContainer }}
                    icon = { this._renderIcon }
                    onChange = { this._onTypeQuery }
                    placeholder = { this.props.t(`inviteDialog.${placeholderKey}`) }
                    value = { this.state.fieldValue } />
                { Boolean(inviteItems.length) && <View style = { styles.invitedList }>
                    <FlatList
                        data = { inviteItems }
                        horizontal = { true }
                        keyExtractor = { this._keyExtractor }
                        renderItem = { this._renderInvitedItem as any } />
                </View> }
                <View style = { styles.resultList }>
                    <FlatList
                        ItemSeparatorComponent = { this._renderSeparator }
                        data = { selectableItems }
                        extraData = { inviteItems }
                        keyExtractor = { this._keyExtractor }
                        renderItem = { this._renderItem as any } />
                </View>
            </JitsiScreen>
        );
    }

    /**
     * Clears the dialog content.
     *
     * @returns {void}
     */
    _clearState() {
        this.setState(this.defaultState);
    }

    /**
     * Returns an object capable of being rendered by an {@code AvatarListItem}.
     *
     * @param {Object} flatListItem - An item of the data array of the {@code FlatList}.
     * @returns {?Object}
     */
    _getRenderableItem(flatListItem: any) {
        const { item } = flatListItem;

        switch (item.type) {
        case INVITE_TYPES.PHONE:
            return {
                avatar: IconPhoneRinging,
                key: item.number,
                title: item.number
            };
        case INVITE_TYPES.USER:
            return {
                avatar: item.avatar,
                key: item.id || item.user_id,
                title: item.name
            };
        default:
            return null;
        }
    }

    /**
     * Key extractor for the flatlist.
     *
     * @param {Object} item - The flatlist item that we need the key to be
     * generated for.
     * @returns {string}
     */
    _keyExtractor(item: any) {
        return item.type === INVITE_TYPES.USER ? item.id || item.user_id : item.number;
    }

    /**
     * Callback to clear the text field.
     *
     * @returns {void}
     */
    _onClearField() {
        this.setState({
            fieldValue: ''
        });

        // Clear search results
        // @ts-ignore
        this._onTypeQuery('');
    }

    /**
     * Invites the selected entries.
     *
     * @returns {void}
     */
    _onInvite() {
        // @ts-ignore
        this._invite(this.state.inviteItems)
            .then((invitesLeftToSend: ArrayLike<any>) => {
                if (invitesLeftToSend.length) {
                    this.setState({
                        // @ts-ignore
                        inviteItems: invitesLeftToSend
                    });
                    this._showFailedInviteAlert();
                }
            });
    }

    /**
     * Function to prepare a callback for the onPress event of the touchable.
     *
     * @param {Item} item - The item on which onPress was invoked.
     * @returns {Function}
     */
    _onPressItem(item: Item) {
        return () => {
            // @ts-ignore
            const { inviteItems } = this.state;
            const finderKey = item.type === INVITE_TYPES.PHONE ? 'number' : 'user_id';

            if (inviteItems.find(
                // @ts-ignore
                _.matchesProperty(finderKey, item[finderKey]))) {
                // Item is already selected, need to unselect it.
                this.setState({
                    // @ts-ignore
                    inviteItems: inviteItems.filter(
                        // @ts-ignore
                        (element: any) => item[finderKey] !== element[finderKey])
                });
            } else {
                // Item is not selected yet, need to add to the list.
                const items: Array<Object> = inviteItems.concat(item);

                this.setState({
                    // @ts-ignore
                    inviteItems: _.sortBy(items, [ 'name', 'number' ])
                });
            }
        };
    }

    /**
     * Shows the system share sheet to share the meeting information.
     *
     * @returns {void}
     */
    _onShareMeeting() {
        // @ts-ignore
        if (this.state.inviteItems.length > 0) {
            // The use probably intended to invite people.
            this._onInvite();
        } else {
            // @ts-ignore
            this.props.dispatch(beginShareRoom());
        }
    }

    /**
     * Handles the typing event of the text field on the dialog and performs the
     * search.
     *
     * @param {string} query - The query that is typed in the field.
     * @returns {void}
     */
    _onTypeQuery(query: string) {
        this.setState({
            fieldValue: query
        });

        clearTimeout(this.searchTimeout);
        // @ts-ignore
        this.searchTimeout = setTimeout(() => {
            this.setState({
                searchInprogress: true
            }, () => {
                this._performSearch(query);
            });
        }, 500);
    }

    /**
     * Performs the actual search.
     *
     * @param {string} query - The query to search for.
     * @returns {void}
     */
    _performSearch(query: string) {
        this._query(query).then(results => {
            this.setState({
                selectableItems: _.sortBy(results, [ 'name', 'number' ])
            });
        })
        .finally(() => {
            this.setState({
                searchInprogress: false
            });
        });
    }

    /**
     * Renders a single item in the invited {@code FlatList}.
     *
     * @param {Object} flatListItem - An item of the data array of the
     * {@code FlatList}.
     * @param {number} index - The index of the currently rendered item.
     * @returns {ReactElement<any>}
     */
    _renderInvitedItem(flatListItem: any, index: number): ReactElement | null {
        const { item } = flatListItem;
        const renderableItem = this._getRenderableItem(flatListItem);

        return (
            <TouchableOpacity onPress = { this._onPressItem(item) } >
                <View
                    pointerEvents = 'box-only'
                    style = { styles.itemWrapper as ViewStyle }>
                    <AvatarListItem
                        avatarOnly = { true }
                        avatarSize = { AVATAR_SIZE }
                        avatarStatus = { item.status }
                        avatarStyle = { styles.avatar }
                        avatarTextStyle = { styles.avatarText }
                        item = { renderableItem as any }
                        key = { index }
                        linesStyle = { styles.itemLinesStyle }
                        titleStyle = { styles.itemText } />
                    <Icon
                        src = { IconCloseCircle }
                        style = { styles.unselectIcon } />
                </View>
            </TouchableOpacity>
        );
    }

    /**
     * Renders a single item in the search result {@code FlatList}.
     *
     * @param {Object} flatListItem - An item of the data array of the
     * {@code FlatList}.
     * @param {number} index - The index of the currently rendered item.
     * @returns {?ReactElement<*>}
     */
    _renderItem(flatListItem: any, index: number): ReactElement | null {
        const { item } = flatListItem;
        // @ts-ignore
        const { inviteItems } = this.state;
        let selected = false;
        const renderableItem = this._getRenderableItem(flatListItem);

        if (!renderableItem) {
            return null;
        }

        switch (item.type) {
        case INVITE_TYPES.PHONE:
            selected = inviteItems.find(_.matchesProperty('number', item.number));
            break;
        case INVITE_TYPES.USER:
            selected = item.id
                ? inviteItems.find(_.matchesProperty('id', item.id))
                : inviteItems.find(_.matchesProperty('user_id', item.user_id));
            break;
        default:
            return null;
        }

        return (
            <TouchableOpacity onPress = { this._onPressItem(item) } >
                <View
                    pointerEvents = 'box-only'
                    style = { styles.itemWrapper as ViewStyle }>
                    <AvatarListItem
                        avatarSize = { AVATAR_SIZE }
                        avatarStatus = { item.status }
                        avatarStyle = { styles.avatar }
                        avatarTextStyle = { styles.avatarText }
                        item = { renderableItem as any }
                        key = { index }
                        linesStyle = { styles.itemLinesStyle }
                        titleStyle = { styles.itemText } />
                    { selected && <Icon
                        src = { IconCheck }
                        style = { styles.selectedIcon } /> }
                </View>
            </TouchableOpacity>
        );
    }

    /**
     * Renders the item separator.
     *
     * @returns {?ReactElement<*>}
     */
    _renderSeparator() {
        return (
            <View style = { styles.separator } />
        );
    }

    /**
     * Renders a button to share the meeting info.
     *
     * @returns {React#Element<*>}
     */
    _renderShareMeetingButton() {
        return (
            <View
                style = { [
                    styles.bottomBar as ViewStyle,
                    this.state.bottomPadding ? styles.extraBarPadding : null
                ] }>
                <TouchableOpacity
                    onPress = { this._onShareMeeting }>
                    <Icon
                        src = { IconShare }
                        style = { styles.shareIcon } />
                </TouchableOpacity>
            </View>
        );
    }

    /**
     * Renders an icon.
     *
     * @returns {React#Element<*>}
     */
    _renderIcon() {
        if (this.state.searchInprogress) {
            return (
                <ActivityIndicator
                    color = { BaseTheme.palette.icon01 }
                    size = 'small' />
            );
        }

        return (
            <Icon
                src = { IconSearch }
                style = { styles.searchIcon } />
        );
    }

    /**
     * Shows an alert telling the user that some invitees were failed to be
     * invited.
     *
     * NOTE: We're using an Alert here because we're on a modal and it makes
     * using our dialogs a tad more difficult.
     *
     * @returns {void}
     */
    _showFailedInviteAlert() {
        // @ts-ignore
        this.props.dispatch(openDialog(AlertDialog, {
            contentKey: {
                key: 'inviteDialog.alertText'
            }
        }));
    }
}

/**
 * Maps part of the Redux state to the props of this component.
 *
 * @param {Object} state - The Redux state.
 * @returns {{
 *     _isVisible: boolean
 * }}
 */
function _mapStateToProps(state: IReduxState) {
    return {
        ..._abstractMapStateToProps(state)
    };
}
// @ts-ignore
export default translate(connect(_mapStateToProps)(AddPeopleDialog));
